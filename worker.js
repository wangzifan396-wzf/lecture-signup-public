const session = chrome.storage.session;
let queue = Promise.resolve();
const serial = task => {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
};

function formKey(raw) {
  const url = new URL(raw);
  return url.origin === 'https://docs.qq.com' && /^\/form\/page\/[\w-]+\/?$/.test(url.pathname)
    ? url.pathname.replace(/\/$/, '') : null;
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const key = sender.tab && sender.url && formKey(sender.url);
  if (!key || sender.frameId !== 0) return false;
  const resume = `resume:${sender.tab.id}`;
  serial(async () => {
    if (message.type === 'stash') {
      await session.set({[resume]: {key, plan: message.plan, until: Date.now() + 600000}});
      return true;
    }
    if (message.type === 'take') {
      const record = (await session.get(resume))[resume];
      await session.remove(resume);
      return record?.key === key && Date.now() <= record.until ? record.plan : null;
    }
    if (message.type === 'drop') { await session.remove(resume); return true; }
    if (message.type === 'receiptDone') { await session.remove(`receipt:${sender.tab.id}`); return true; }
    if (message.type === 'receiptPending') {
      const record = (await session.get(`receipt:${sender.tab.id}`))[`receipt:${sender.tab.id}`];
      return record?.key === key && record.until > Date.now() ? record.until : null;
    }
    if (message.type === 'claim') {
      const claim = `clicked:${key}`;
      if ((await session.get(claim))[claim]) return false;
      const marker = {[`receipt:${sender.tab.id}`]: {key, until: Date.now() + 30000}};
      const owner = {tab:sender.tab.id, token:crypto.randomUUID()};
      await session.set({[claim]: owner, ...marker});
      return owner.token;
    }
    if (message.type === 'releaseUnclicked') {
      const claim = `clicked:${key}`;
      const owner = (await session.get(claim))[claim];
      if (owner?.tab !== sender.tab.id || owner.token !== message.plan?.claim) return false;
      await session.remove([claim, `receipt:${sender.tab.id}`]);
      return true;
    }
    throw Error('未知操作');
  }).then(value => respond({value}), () => respond({error: '本机状态不可用；请手动操作。'}));
  return true;
});

chrome.tabs.onRemoved.addListener(tabId => { void serial(() => session.remove([`resume:${tabId}`,`receipt:${tabId}`])); });
chrome.action.onClicked.addListener(async tab => {
  try { await chrome.tabs.sendMessage(tab.id, {type: 'show'}); }
  catch { await chrome.tabs.create({url: chrome.runtime.getURL('help.html')}); }
});
