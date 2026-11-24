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

async function pendingReceipt(tabId, key) {
  const slot = `receipt:${tabId}`;
  const record = (await session.get(slot))[slot];
  return record?.key === key && record.until > Date.now() ? record : null;
}

async function clearReceipt(tabId, key, token) {
  const slot = `receipt:${tabId}`;
  const record = (await session.get(slot))[slot];
  if (record?.key !== key || (token && record.token !== token)) return false;
  await session.remove(slot);
  return true;
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
    if (message.type === 'receiptDone') return clearReceipt(sender.tab.id, key, message.plan?.claim);
    if (message.type === 'receiptPending') return pendingReceipt(sender.tab.id, key);
    if (message.type === 'submittedBefore') {
      return Boolean((await session.get(`clicked:${key}`))[`clicked:${key}`]);
    }
    if (message.type === 'submissionState') {
      const slot = `clicked:${key}`;
      const owner = (await session.get(slot))[slot];
      const busy = owner && await pendingReceipt(owner.tab, key);
      return {token:owner?.token ?? null, busy:Boolean(busy)};
    }
    if (message.type === 'receiptProgress') {
      const slot = `receipt:${sender.tab.id}`;
      const record = (await session.get(slot))[slot];
      if (record?.key !== key || record.token !== message.plan?.claim) return false;
      await session.set({[slot]: {...record, timeline:message.plan.timeline, until:Date.now() + 30000}});
      return true;
    }
    if (message.type === 'claim') {
      const claim = `clicked:${key}`;
      const prior = (await session.get(claim))[claim];
      if ((message.plan?.startingClaim ?? null) !== (prior?.token ?? null)) return false;
      if (prior && await pendingReceipt(prior.tab, key)) return false;
      const owner = {tab:sender.tab.id, token:message.plan?.claim || crypto.randomUUID()};
      if (prior) owner.previous = {tab:prior.tab, token:prior.token};
      const marker = {[`receipt:${sender.tab.id}`]: {key, token:owner.token, previousCount:message.plan?.previousCount || 0, until: Date.now() + 30000}};
      await session.set({[claim]: owner, ...marker});
      return owner.token;
    }
    if (message.type === 'releaseUnclicked') {
      const claim = `clicked:${key}`;
      const owner = (await session.get(claim))[claim];
      if (owner?.tab !== sender.tab.id || owner.token !== message.plan?.claim) return false;
      if (owner.previous) await session.set({[claim]:owner.previous});
      else await session.remove(claim);
      await clearReceipt(sender.tab.id, key, owner.token);
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
