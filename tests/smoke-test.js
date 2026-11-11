// Optional automated check of the 11 scenarios. Run with the app already started: npm run test:smoke
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const results = [];
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');

function client() {
  let cookie = '';
  return async (path, opts = {}) => {
    const res = await fetch(BASE + path, { redirect: 'manual', ...opts, headers: { ...(opts.headers || {}), cookie } });
    const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    if (set.length) cookie = set.map(c => c.split(';')[0]).join('; ');
    const text = await res.text();
    return { status: res.status, loc: res.headers.get('location'), text };
  };
}
const form = (o) => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(o).toString() });
const multi = (o, file) => {
  const fd = new FormData();
  Object.entries(o).forEach(([k, v]) => fd.append(k, v));
  if (file) fd.append('image', new Blob([file.data], { type: file.type }), file.name);
  return { method: 'POST', body: fd };
};
function check(name, cond, detail = '') { results.push({ name, pass: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${cond ? '' : detail}`); }

(async () => {
  const sfx = Date.now().toString().slice(-6);
  const a = client(), b = client(), anon = client();
  const ua = 'alice' + sfx, ub = 'bob' + sfx;

  // 1 register
  let r = await a('/register', form({ username: ua, email: ua + '@example.com', password: 'Passw0rd!x' }));
  check('1a Register new user', r.status === 302 && r.loc === '/login', r.status);
  r = await a('/register', form({ username: ua, email: 'other' + sfx + '@example.com', password: 'Passw0rd!x' }));
  check('1b Duplicate username rejected', r.status === 400 && /already taken/.test(r.text));
  r = await a('/register', form({ username: 'zz' + sfx, email: ua + '@example.com', password: 'Passw0rd!x' }));
  check('1c Duplicate email rejected', r.status === 400 && /already registered/.test(r.text));
  await b('/register', form({ username: ub, email: ub + '@example.com', password: 'Passw0rd!x' }));

  // 2 login
  r = await a('/login', form({ username: ua, password: 'wrong' }));
  check('2a Wrong password rejected', r.status === 401 && /Incorrect/.test(r.text));
  r = await a('/login', form({ username: ua, password: 'Passw0rd!x' }));
  check('2b Correct login', r.status === 302);
  await b('/login', form({ username: ub, password: 'Passw0rd!x' }));

  // 3 create
  const good = { title: 'Test wallet ' + sfx, description: 'Brown wallet', category_id: '1', kind: 'lost', status: 'open', location: 'Lab' };
  r = await a('/items', multi(good));
  const id = (r.loc || '').split('/').pop();
  check('3a Create valid record', r.status === 302 && /^\d+$/.test(id), r.status);
  r = await a('/items', multi({ ...good, title: '  ' }));
  check('3b Empty title rejected', r.status === 400 && /Title is required/.test(r.text));
  r = await a('/items', multi({ ...good, category_id: '9999' }));
  check('3c Invalid category rejected', r.status === 400 && /does not exist/.test(r.text));
  r = await a('/items', multi({ ...good, status: 'hacked' }));
  check('3d Invalid status rejected', r.status === 400 && /Invalid status/.test(r.text));

  // 4 browse/search
  r = await anon('/items');
  check('4a Visitor can browse', r.status === 200 && /Lost &amp; Found Board/.test(r.text));
  r = await anon('/items?q=' + encodeURIComponent('wallet ' + sfx));
  check('4b Keyword search finds record', r.status === 200 && r.text.includes('Test wallet ' + sfx));
  r = await anon('/items?q=zzzznomatch');
  check('4c Empty results message', /No items match/.test(r.text));
  r = await anon('/items?category=1');
  check('4d Category filter works', r.status === 200 && !/Student ID card/.test(r.text));
  r = await anon('/items/' + id);
  check('4e Visitor can view details', r.status === 200 && r.text.includes('Brown wallet'));

  // 5 update/delete own
  r = await a(`/items/${id}/edit`, multi({ ...good, title: 'Edited ' + sfx }));
  check('5a Owner can update', r.status === 302);
  r = await anon('/items/' + id);
  check('5b Update saved', r.text.includes('Edited ' + sfx));

  // 6 second user blocked
  r = await b(`/items/${id}/edit`);
  check('6a Other user cannot open edit form (403)', r.status === 403);
  r = await b(`/items/${id}/edit`, multi({ ...good, title: 'HACKED' }));
  check('6b Other user cannot update via direct POST', r.status === 403);
  r = await b(`/items/${id}/delete`, { method: 'POST' });
  check('6c Other user cannot delete via direct POST', r.status === 403);
  r = await anon('/items/' + id);
  check('6d Record unchanged after attacks', r.text.includes('Edited ' + sfx) && !r.text.includes('HACKED'));

  // 7 image upload
  r = await a(`/items/${id}/edit`, multi({ ...good, title: 'Edited ' + sfx }, { data: PNG, type: 'image/png', name: 'x.png' }));
  r = await anon('/items/' + id);
  const img = (r.text.match(/\/uploads\/[a-f0-9]+\.png/) || [])[0];
  check('7a Valid PNG accepted, server-named', !!img);
  r = await a(`/items/${id}/edit`, multi({ ...good }, { data: Buffer.from('hello'), type: 'text/plain', name: 'x.txt' }));
  check('7b Unsupported type rejected', r.status === 400 && /Only JPEG or PNG/.test(r.text));
  r = await a(`/items/${id}/edit`, multi({ ...good }, { data: Buffer.from('not an image'), type: 'image/png', name: 'fake.png' }));
  check('7c Fake PNG (bad signature) rejected', r.status === 400 && /Only JPEG or PNG/.test(r.text));
  r = await a(`/items/${id}/edit`, multi({ ...good }, { data: Buffer.concat([PNG, Buffer.alloc(2.5 * 1024 * 1024)]), type: 'image/png', name: 'big.png' }));
  check('7d Oversized image rejected', r.status === 400 && /2 MB/.test(r.text), r.status);

  // Pagination (optional extension): 12 per page, filters kept in page links
  const tag = 'Pager' + sfx;
  const pagerIds = [];
  for (let i = 1; i <= 13; i++) {
    r = await a('/items', multi({ ...good, title: `${tag} item ${i}` }));
    pagerIds.push((r.loc || '').split('/').pop());
  }
  r = await anon('/items?q=' + tag);
  check('P1 First page shows 12 of 13', /Showing 1&ndash;12 of 13/.test(r.text) && (r.text.match(/class="card card-hover post-card/g) || []).length === 12);
  check('P2 Next link keeps the search filter', r.text.includes(`href="/items?q=${tag}&amp;page=2"`));
  r = await anon('/items?q=' + tag + '&page=2');
  check('P3 Second page shows item 13', /Showing 13&ndash;13 of 13/.test(r.text) && /aria-current="page" aria-label="Page 2/.test(r.text));
  r = await anon('/items?q=' + tag + '&page=999');
  check('P4 Page past the end shows the last page', r.status === 200 && /Showing 13&ndash;13 of 13/.test(r.text));
  r = await anon('/items?page=abc');
  check('P5 Invalid page number falls back to page 1', r.status === 200 && /Showing 1&ndash;/.test(r.text));
  r = await anon('/items?q=a&q=b');
  check('P6 Repeated query parameter does not crash', r.status === 200);
  for (const pid of pagerIds) await a(`/items/${pid}/delete`, { method: 'POST' });
  r = await anon('/items?q=' + tag);
  check('P7 Test posts cleaned up', /No items match/.test(r.text));

  // 9 missing record
  r = await anon('/items/999999');
  check('9a Nonexistent record -> 404 page', r.status === 404 && /could not be found/.test(r.text));
  r = await anon('/items/abc');
  check('9b Non-numeric id -> 404 page', r.status === 404);

  // 8 logout / protected
  r = await anon('/items/new');
  check('8a Anonymous cannot open create form', r.status === 302 && r.loc === '/login');
  r = await anon('/items', multi(good));
  check('8b Anonymous cannot create', r.status === 302 && r.loc === '/login');
  r = await anon(`/items/${id}/delete`, { method: 'POST' });
  check('8c Anonymous cannot delete', r.status === 302 && r.loc === '/login');
  r = await a('/logout', { method: 'POST' });
  r = await a('/items/mine');
  check('8d After logout, My posts requires login', r.status === 302 && r.loc === '/login');

  // delete own
  await a('/login', form({ username: ua, password: 'Passw0rd!x' }));
  r = await a(`/items/${id}/delete`, { method: 'POST' });
  check('5c Owner can delete', r.status === 302);
  r = await anon('/items/' + id);
  check('5d Deleted record gives 404', r.status === 404);

  const failed = results.filter(x => !x.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
