(() => {
  const form = globalThis.LectureForm;
  const live = location.origin === 'https://docs.qq.com';
  if (live && !/^\/form\/page\/[\w-]+\/?$/.test(location.pathname)) return;
  const host = document.createElement('div');
  host.id = 'lecture-signup-public-helper';
  const shadow = host.attachShadow({mode: live ? 'closed' : 'open'});
  const add = (tag, parent, text) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    parent.append(element);
    return element;
  };
  add('style', shadow, `:host{all:initial;position:fixed;right:14px;bottom:14px;z-index:2147483646;color:#172b32;font:14px/1.5 system-ui,"Microsoft YaHei",sans-serif}*{box-sizing:border-box}[hidden]{display:none!important}.panel{background:#fff;border:1px solid #b7cec9;border-radius:14px;box-shadow:0 8px 32px #102e3240;width:min(365px,92vw);max-height:80vh;overflow:auto;padding:15px}.bar{display:flex;gap:8px;align-items:center;justify-content:space-between;margin:6px 0}.wrap{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}h2{font-size:17px;margin:0}label.field{display:block;margin:7px 0;font-weight:600}input:not([type=checkbox]),select,textarea{display:block;width:100%;padding:5px 7px;border:1px solid #9eafb1;border-radius:5px;font:inherit;color:#172b32;background:#fff}textarea{resize:vertical}button{padding:5px 9px;background:#f3f7f6;color:#194641;border:1px solid #afc5bf;border-radius:6px;font:inherit;cursor:pointer}button:disabled{opacity:.55;cursor:default}.primary,.chip{background:#075c53;color:white;border-color:#075c53;font-weight:650}.chip{display:block;margin:6px 0 0 auto;border-radius:20px;padding:7px 15px}p{margin:7px 0}.msg{background:#edf5f3;padding:7px 9px;border-radius:6px;overflow-wrap:anywhere}.minor{font-size:12px;color:#53666a}.check{display:flex;align-items:flex-start;gap:5px;margin:7px 0}.check input{margin-top:4px;flex:none}`);
  const panel = add('section', shadow); panel.className = 'panel'; panel.hidden = live;
  const heading = add('div', panel); heading.className = 'bar';
  add('h2', heading, live ? '讲座报名助手（公开版）' : '讲座报名助手（公开版）· 本地演练');
  const button = (parent, text, fn) => {
    const item = add('button', parent, text); item.type = 'button'; item.addEventListener('click', fn); return item;
  };
  button(heading, '收起', () => {panel.hidden = true;});
  const controls = add('div', panel);
  function field(title, tag = 'input', type = 'text') {
    const label = add('label', controls, title); label.className = 'field';
    const item = add(tag, label); if (tag === 'input') item.type = type;
    return item;
  }
  const nameField = field('姓名'), studentField = field('学号（保留前导零）');
  nameField.autocomplete = studentField.autocomplete = 'off';
  const gradeField = field('年级（填写本场选项的完整文字）');
  gradeField.placeholder = '例如：2025级博士';
  const delayField = field('开放后第几秒点提交', 'input', 'number');
  Object.assign(delayField, {min:'3.1', max:'300', step:'0.1', defaultValue:'4', required:true});
  const delayHint = add('small', controls, '例：开放时间 00:00:00，填 4 表示目标 00:00:04。若页面更晚才就绪，填完即交。开放时间留空则从启动时算。');
  const saved = add('div', controls); saved.className = 'wrap';
  const openAt = field('开放时间（电脑本地时间；留空立即开始）', 'input', 'datetime-local'); openAt.step = '1';
  const mode = field('执行方式', 'select');
  for (const [value, label] of [['full','全自动：提交、确认并检查回执'],['fill','仅填写，由我提交']]) { const option = add('option', mode, label); option.value = value; }
  function updateMode() {
    delayField.parentElement.hidden = delayHint.hidden = mode.value !== 'full';
  }
  mode.addEventListener('change', updateMode); updateMode();
  const notice = field('须知题干（与本场原文核对）', 'textarea'); notice.rows = 2; notice.value = form.defaultNotice;
  function check(text) {
    const label = add('label', controls); label.className = 'check';
    const item = add('input', label); item.type = 'checkbox'; add('span', label, text); return item;
  }
  const agreed = check('已核对本场须知，启动时选择我填写的年级并勾选「我已知晓」。'); agreed.checked = true;
  const refresh = check('指定开放时间时，如页面尚不可填，允许届时刷新一次。'); refresh.checked = live;
  if (!live) refresh.parentElement.hidden = true;
  const actions = add('div', controls); actions.className = 'wrap';
  const start = button(actions, '启动本场', arm); start.className = 'primary';
  button(actions, '检查本页（不填写）', () => {
    const report = [live ? '腾讯实页（只读检查）' : '离线演练（只读检查）'];
    const answers = {notice:notice.value, grade:gradeField.value};
    try {form.fields(answers, false); report.push('四项匹配');} catch (error) {report.push(error.message);}
    const problem = form.status();
    if (problem) report.push(problem);
    else {
      try {form.fields(answers); report.push('可编辑');} catch (error) {report.push(`未确认可编辑：${error.message}`);}
      try {form.submitButton(); report.push('找到可用提交按钮');} catch (error) {report.push(error.message);}
    }
    say(report.join('｜') + '（未填写、未提交）');
  });
  const cancel = button(panel, '取消本次任务', () => stop(active?.submitted ? '已停止后续操作；提交操作不能撤回，请核对记录。' : '已取消，不会自动提交。')); cancel.hidden = true;
  const message = add('p', panel, '只对当前页生效。启动后可切屏，请保留报名标签；后台执行可能延迟。'); message.className = 'msg'; message.setAttribute('role', 'status');
  const chipTitle = '报名助手 · 公开版';
  const chip = button(shadow, chipTitle, () => {panel.hidden = !panel.hidden;}); chip.className = 'chip';
  document.documentElement.append(host);
  let active = null, demoClaim = false;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function waitUntil(plan, at) {
    while (Date.now() < at) {
      assertCurrent(plan);
      await new Promise(resolve => {
        const wake = () => {clearTimeout(timer); if (plan.wake === wake) plan.wake = null; resolve();};
        const timer = setTimeout(wake, Math.max(1, at - Date.now()));
        plan.wake = wake;
      });
    }
    assertCurrent(plan);
  }
  const rpc = async (type, plan) => {
    const result = await chrome.runtime.sendMessage({type, plan});
    if (!result || result.error) throw Error(result?.error || '扩展未就绪，请刷新页面后重新启动。');
    return result.value;
  };
  function say(text) { if (message.textContent !== text) message.textContent = text; }
  function stop(text) {
    active?.wake?.();
    if (live && active?.tracking) void rpc('receiptDone').catch(() => {});
    active = null; controls.hidden = false; cancel.hidden = true;
    chip.textContent = chipTitle; panel.hidden = false; say(text);
  }
  const identity = () => ({name:nameField.value.trim(), student:studentField.value.trim(), grade:gradeField.value.trim()});
  function validateProfile(profile) {
    if (!profile.grade) throw Error('请填写年级选项的完整文字。');
    if (!profile.name || profile.name.length > 60 || !/^[A-Za-z0-9-]{1,40}$/.test(profile.student)) throw Error('请输入本人姓名和学号；学号只支持字母、数字、短横线。');
  }
  function targetSeconds() {
    if (!delayField.validity.valid) throw Error('提交秒数须为 3.1 至 300，可保留一位小数，例如 4 或 3.5。');
    return delayField.valueAsNumber;
  }
  if (live) {
    button(saved, '保存本机资料', async () => {
      try {
        const profile = identity(); validateProfile(profile);
        profile.delaySeconds = targetSeconds();
        await chrome.storage.local.set({profile});
        say(`已保存姓名、学号、年级「${profile.grade}」和提交秒数（${profile.delaySeconds} 秒）。`);
      } catch (error) {say(error.message);}
    });
    button(saved, '清除本机资料', async () => {
      try { await chrome.storage.local.remove('profile'); nameField.value = ''; studentField.value = ''; gradeField.value = ''; delayField.value = delayField.defaultValue; say('已清除本机资料，提交秒数恢复为 4 秒。'); } catch (error) {say(error.message);}
    });
    chrome.runtime.onMessage.addListener((msg, sender, respond) => { if (msg.type === 'show') { panel.hidden = false; respond(true); } });
  } else {nameField.value = '演练同学'; studentField.value = '00123456'; gradeField.value = '2025级硕士';}

  function arm() {
    if (active) return;
    try {
      const profile = identity(); validateProfile(profile);
      if (!agreed.checked || !notice.value.trim()) throw Error('请先核对本场须知，并勾选确认。');
      const scheduled = openAt.value !== '';
      const at = scheduled ? new Date(openAt.value).getTime() : Date.now();
      const auto = mode.value === 'full';
      const delayMs = auto ? Math.round(targetSeconds() * 1000) : 0;
      if (!Number.isFinite(at) || (scheduled && Math.abs(at - Date.now()) >= 86400000)) throw Error('请填写距现在不到 24 小时的本场开放时间。');
      const problem = form.status();
      if (problem && !problem.includes('尚未开放')) throw Error(problem);
      run({...profile, at, openTime:openAt.value, notice:notice.value.trim(), delayMs, auto, refresh:live && refresh.checked && scheduled, href:location.href});
    } catch (error) {say(error.message);}
  }

  function assertCurrent(token) {
    if (active !== token) throw Error('任务已取消。');
    if (location.href !== token.href) throw Error('报名页地址已改变，本次任务停止。');
  }

  async function track(plan, until, canConfirm) {
    const original = new URL(plan.href);
    while (active === plan && Date.now() < until) {
      if (location.origin !== original.origin || location.pathname !== original.pathname) {
        stop('已离开当前表单，结果未确认。请核对记录，不会重试。'); return;
      }
      const blocker = form.postBlocker();
      if (blocker) {stop(`${blocker}；结果未确认，不会重试。`); return;}
      const receipt = form.receipt();
      if (receipt) {stop(`${live ? '腾讯页面回执' : '本地模拟回执'}：「${receipt}」。${plan.timeline || ''}`); return;}
      if (canConfirm && !plan.confirmed && location.href === plan.href) {
        const confirmation = form.confirmation();
        if (confirmation?.ready) {
          plan.confirmed = true;
          plan.timeline += ` 确认 +${((Date.now() - plan.at) / 1000).toFixed(3)} 秒。`;
          confirmation.target.click();
          say(`已点一次确认，等待回执。脚本不会再点击。${plan.timeline}`);
        }
      }
      await sleep(40);
    }
    if (active === plan) stop(`结果未确认：没有识别到回执，不重复提交。请查看腾讯记录或手动检查弹窗。${plan.timeline || ''}`);
  }

  async function run(plan) {
    active = plan; controls.hidden = true; cancel.hidden = false; panel.hidden = false; chip.textContent = '报名助手 · 运行中';
    try {
      if (Date.now() < plan.at) {
        say(`等待 ${new Date(plan.at).toLocaleTimeString('zh-CN', {hour12:false})} 开放。可切屏；需要停止时请点取消。`);
        await waitUntil(plan, plan.at);
      }
      let lastIssue = '';
      for (;;) {
        assertCurrent(plan);
        const problem = form.status();
        if (problem && !problem.includes('尚未开放')) throw Error(problem);
        try { if (problem) throw Error(problem); form.fields(plan); break; } catch (error) {
          if (error.ambiguous || error.mismatch) throw error;
          lastIssue = error.message;
        }
        if (plan.refresh && Date.now() >= plan.at + 250) {
          plan.refresh = false;
          say('到点仍不可填写，正在刷新一次。');
          await rpc('stash', plan);
          try { assertCurrent(plan); } catch (error) { await rpc('drop'); throw error; }
          location.reload(); return;
        }
        say(`等待题目可编辑：${lastIssue} 可取消。`); await sleep(Date.now() - plan.at < 30000 ? 80 : 500);
      }
      assertCurrent(plan);
      form.fill(plan);
      if (!plan.auto) { await sleep(80); assertCurrent(plan); form.verify(plan); stop('四项已填写并核对，未点击提交。请自行检查并提交。'); return; }
      const aim = plan.at + plan.delayMs;
      say(`四项已填写。目标是开放后 +${plan.delayMs / 1000} 秒；若已过目标，就绪后立即提交。`);
      await waitUntil(plan, aim);
      const preClick = () => {
        assertCurrent(plan); const problem = form.status(); if (problem) throw Error(problem);
        form.verify(plan); return form.submitButton();
      };
      for (;;) {
        assertCurrent(plan);
        const problem = form.status(); if (problem) throw Error(problem);
        try { form.verify(plan); form.submitButton(); break; } catch (error) {
          if (error.ambiguous || error.mismatch) throw error;
          lastIssue = error.message;
        }
        say(`已过目标时刻，仍在等待：${lastIssue} 可取消。`);
        await sleep(Date.now() - plan.at < 30000 ? 40 : 500);
      }
      if (form.confirmation() || form.receipt()) throw Error('提交前已有弹窗或回执，不启动自动确认。');
      const claim = live ? await rpc('claim') : !demoClaim;
      if (!claim) throw Error('本次浏览器会话已为此表保留过一次提交，不再重复点击。');
      let elapsed;
      try {
        const target = preClick();
        elapsed = Date.now() - plan.at;
        if (elapsed < plan.delayMs) throw Error('本机时钟变化，未自动提交。');
        if (!live) demoClaim = true;
        plan.timeline = `提交 +${(elapsed / 1000).toFixed(3)} 秒。`;
        plan.tracking = true;
        plan.submitted = true;
        target.click();
      } finally {
        if (live && !plan.submitted) await rpc('releaseUnclicked', {claim});
      }
      say(`已点一次提交，等待确认框或回执。${plan.timeline}`);
      await track(plan, Date.now() + 30000, true);
    } catch (error) { if (active === plan) stop(error.message); }
  }

  window.addEventListener('hashchange', () => {
    if (active && !active.submitted && location.href !== active.href) stop('报名页地址已改变，本次任务停止。');
  });
  window.addEventListener('pagehide', () => {active?.wake?.(); active = null;});
  window.addEventListener('pageshow', event => {if (event.persisted) stop('页面从历史记录恢复；如需执行，请重新启动。');});
  document.addEventListener('click', event => {
    if (!active || !event.isTrusted || event.composedPath().includes(host)) return;
    const target = event.target.closest?.('button,[role="button"],input[type="submit"],[class*="submit" i]');
    if (active.submitted && ['确认','取消'].includes(form.caption(target || event.target))) {stop('检测到手动操作，请自行核对结果；不再自动确认。');return;}
    if (target && form.submitLabels.has(form.caption(target))) stop('检测到手动提交，自动任务已取消。');
  }, true);
  document.addEventListener('submit', event => {if (active && !active.submitted && event.isTrusted) stop('检测到手动提交，自动任务已取消。');}, true);

  if (live) {
    start.disabled = true;
    (async () => {
      try {
        const profile = (await chrome.storage.local.get('profile')).profile;
        if (profile) {
          nameField.value = profile.name; studentField.value = profile.student; gradeField.value = profile.grade ?? '';
          if (Number.isFinite(profile.delaySeconds)) {
            delayField.value = String(profile.delaySeconds);
            if (!delayField.validity.valid) delayField.value = delayField.defaultValue;
          }
        }
        const pending = await rpc('receiptPending');
        if (pending) {
          const marker = {href:location.href, tracking:true, submitted:true};
          active = marker; panel.hidden = false; controls.hidden = true; cancel.hidden = false;
          say('页面已跳转，仅检查回执，不再点击。');
          await track(marker, pending, false); return;
        }
        const plan = await rpc('take');
        if (plan && plan.href === location.href && Number.isFinite(plan.delayMs)) {
          nameField.value = plan.name; studentField.value = plan.student; gradeField.value = plan.grade ?? ''; notice.value = plan.notice;
          openAt.value = plan.openTime || '';
          mode.value = plan.auto ? 'full' : 'fill'; updateMode();
          if (plan.auto) delayField.value = String(plan.delayMs / 1000);
          await run({...plan, refresh:false});
        } else if (plan) {stop('刷新后表单地址或任务信息不匹配；未自动提交。');}
      } catch (error) { stop(`扩展初始化失败：${error.message}`); }
      finally {start.disabled = false;}
    })();
  }
})();
