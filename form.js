(() => {
  const compact = text => String(text ?? '').normalize('NFKC').replace(/\s+/g, '').trim();
  const visible = element => element.isConnected && element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility === 'visible' && !element.closest('[hidden],[inert],[aria-hidden="true"]');
  const list = (root, selector) => Array.from(root.querySelectorAll(selector)).filter(visible);
  const unique = (items, label) => {
    if (items.length !== 1) throw Object.assign(Error(`无法唯一识别${label}（找到 ${items.length} 个）。`), {ambiguous:items.length > 1});
    return items[0];
  };
  const locked = element => element.matches(':disabled,[readonly],[aria-readonly="true"]') ||
    Boolean(element.closest('[inert],[aria-disabled="true"],.readonly,.disabled,.is-disabled'));
  const defaultNotice = '会议开始前15分钟开始扫码签到，会议正式结束后扫码签退';
  const submitLabels = new Set(['提交', '提交报名', '提交报名表', '提交表单']);
  const receiptPattern = /^(?:(?:你|您)?(?:已成功提交|提交成功|填写成功)|已报名成功|报名成功|(?:你|您|我)已提交[1-9]\d*份)[!。！]?$/;

  function status() {
    const lines = document.body.innerText.split(/\n+/).map(compact);
    const text = lines.join('');
    if (lines.some(line => receiptPattern.test(line) || line === '生成凭证')) return '这份表已有提交记录。';
    if (/名额已满|名额已用完|人数已满|已达收集上限|份数已达上限|已收满/.test(text)) return '报名名额已满。';
    const cap = text.match(/限量(\d+)份/), count = text.match(/已收集(\d+)份/);
    if (cap && count && Number(count[1]) >= Number(cap[1])) return '已收集份数达到上限。';
    if (/收集表登录后才能填写|请先登录后填写|登录后才可填写/.test(text)) return '请先手动登录腾讯文档。';
    if (/已暂停收集|已停止收集|已结束收集|收集已结束|报名已结束/.test(text)) return '表单已暂停或结束收集。';
    if (/未开始收集|收集未开始|暂未开始|报名未开始|尚未开始/.test(text)) return '表单尚未开放。';
    if (list(document, '[role="dialog"],dialog[open],[aria-modal="true"],iframe[title*="验证"]').length) return '页面有弹窗或验证，请手动处理。';
    return '';
  }

  function fields({notice, grade}, writable = true) {
    if (!compact(grade)) throw Object.assign(Error('请填写年级选项的完整文字。'), {mismatch:true});
    const questions = list(document, '.question');
    if (questions.length !== 4) throw Error(`页面有 ${questions.length} 道可见题，不是预期的四题。`);
    const titles = questions.map(question => compact(question.querySelector('.question-title')?.textContent));
    const get = title => {
      if (titles.every(Boolean) && !titles.includes(compact(title))) throw Object.assign(Error(`本场没有题目「${title}」，未自动提交。请核对须知题干。`), {mismatch:true});
      return unique(questions.filter((question, index) => titles[index] === compact(title)), `题目「${title}」`);
    };
    const text = title => {
      const question = get(title);
      const inputs = list(question, 'textarea,input:not([type]),input[type="text"],input[type="tel"],input[type="number"]').filter(field => !field.closest('[role="radio"],[role="checkbox"]'));
      if (!inputs.length) {
        const preview = list(question, '.question-content.readonly .form-ui-component-basic-text.disabled');
        if (preview.length === 1) {
          if (!writable) return preview[0];
          throw Error(`「${title}」是只读预览，尚未提供输入框。`);
        }
      }
      return unique(inputs, `「${title}」输入框`);
    };
    const choice = (title, answer) => {
      const options = list(get(title), '[role="radio"],[role="checkbox"],label').filter(element =>
        element.hasAttribute('role') || element.querySelector('input[type="radio"],input[type="checkbox"]'));
      const label = option => (option.querySelector('.form-choice-option-text-content') ?? option).textContent.trim();
      const matches = options.filter(option => compact(label(option)) === compact(answer));
      if (title === '年级' && !matches.length && options.length && options.every(option => label(option))) {
        throw Object.assign(Error(`找不到年级「${answer}」。本页选项：${options.map(label).join('、')}。请核对后重新启动。`), {mismatch:true});
      }
      return unique(matches, `选项「${answer}」`);
    };
    const controls = {name: text('姓名'), student: text('学号'), grade: choice('年级', grade), ack: choice(notice, '我已知晓')};
    if (writable && Object.values(controls).some(locked)) throw Error('题目尚不可编辑。');
    return controls;
  }

  function setText(element, value) {
    if (element.value === value) return;
    if (element.value.trim()) throw Error('已有不同的姓名或学号；未覆盖，请手动核对。');
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', {bubbles: true}));
    element.dispatchEvent(new Event('change', {bubbles: true}));
  }

  const checked = element => element.querySelector('input[type="radio"],input[type="checkbox"]')?.checked ?? (element.getAttribute('aria-checked') === 'true');
  function fill(plan) {
    const initial = fields(plan);
    if (['name','student'].some(key => initial[key].value.trim() && initial[key].value !== plan[key])) throw Error('已有不同的姓名或学号；未覆盖，请手动核对。');
    for (const key of ['name','student']) setText(fields(plan)[key], plan[key]);
    for (const key of ['grade','ack']) {
      const option = fields(plan)[key];
      if (!checked(option)) option.click();
    }
  }

  function verify(plan) {
    const controls = fields(plan);
    if ((controls.name.value && controls.name.value !== plan.name) || (controls.student.value && controls.student.value !== plan.student))
      throw Object.assign(Error('网页里的姓名或学号已变更，请核对后重新启动。'), {mismatch:true});
    if (controls.name.value !== plan.name || controls.student.value !== plan.student || !checked(controls.grade) || !checked(controls.ack))
      throw Error('网页未保留全部四项答案；请手动核对。');
  }

  const caption = element => compact(element instanceof HTMLInputElement ? element.value : element.innerText);
  function submitButton() {
    const semantic = list(document, 'button,[role="button"],input[type="submit"]').filter(element => submitLabels.has(caption(element)));
    const fallback = semantic.length ? [] : list(document, '.dui-button,[class*="submit" i]').filter(element =>
      submitLabels.has(caption(element)) && getComputedStyle(element).cursor === 'pointer');
    const buttons = semantic.length ? semantic : fallback.filter(element => !fallback.some(other => other !== element && element.contains(other)));
    const button = unique(buttons, '可见的提交按钮');
    if (locked(button) || getComputedStyle(button).pointerEvents === 'none' || /(?:^|[\s_-])disabled(?:$|[\s_-])/.test(button.className)) throw Error('提交按钮不可用。');
    return button;
  }

  const modalSelector = 'dialog[open],[role="dialog"],[role="alertdialog"],[aria-modal="true"],.dui-dialog,.dui-modal,[class*="modal-content"],[class*="dialog-content"]';
  const actionSelector = 'button,[role="button"],input[type="button"],.dui-button';
  const expectedPrompt = '确认提交你的结果吗?';
  function confirmation() {
    const modals = list(document, modalSelector);
    const prompts = [expectedPrompt+'取消确认',expectedPrompt+'确认取消'];
    const buttons = list(document, actionSelector).filter(item => caption(item) === '确认');
    const candidates = buttons.filter(item => {
      for (let parent = item.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (!prompts.includes(compact(parent.innerText))) continue;
        if (parent.closest('.question') || parent.querySelector('iframe,input:not([type="button"]),textarea,select')) return false;
        if (!modals.some(modal => modal.contains(item))) {
          let layer = parent;
          while (layer && layer !== document.body && getComputedStyle(layer).position !== 'fixed') layer = layer.parentElement;
          if (!layer || layer === document.body) return false;
        }
        if (modals.some(modal => !modal.contains(item) && !modal.contains(parent) && !parent.contains(modal))) return false;
        if (modals.some(modal => modal.contains(item) && !prompts.includes(compact(modal.innerText)))) return false;
        const actions = list(parent, actionSelector);
        return actions.filter(action => caption(action) === '确认').length === 1 && actions.filter(action => caption(action) === '取消').length === 1;
      }
      return false;
    });
    if (candidates.length !== 1) return null;
    const target = candidates[0];
    const rect = target.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {target, ready: !locked(target) && target.contains(hit)};
  }

  function receipt() {
    const lines = document.body.innerText.split(/\n+/).map(compact);
    if (!lines.some(line => receiptPattern.test(line))) return '';
    const nodes = list(document,'[role="status"],[role="alert"],output,h1,h2,h3,p,div,span,strong').filter(item =>
      item.children.length <= 1 && !item.closest('.question,.form-head,header,[role="toolbar"],button') && receiptPattern.test(compact(item.innerText)));
    const editable = list(document,'.question textarea,.question input').some(item => !locked(item));
    const match = nodes.find(item => !editable || item.closest('[role="status"],[role="alert"],output,[class*="success"],[class*="toast"],[class*="receipt"]'));
    return match ? compact(match.innerText) : '';
  }

  function postBlocker() {
    const lines = document.body.innerText.split(/\n+/).map(compact);
    if (lines.some(line => /^(?:提交失败|提交出错|网络异常|网络错误|名额已满|收集已结束|已暂停收集|请完成验证|安全验证|收集表登录后才能填写)(?:$|[,:;。!，：；！])/.test(line)) ||
        list(document,'iframe[title*="验证"],iframe[src*="captcha" i]').length) return '页面提示失败、不可填写或需要验证';
    return '';
  }
  globalThis.LectureForm = {defaultNotice, status, fields, fill, verify, submitButton, submitLabels, caption, confirmation, receipt, postBlocker};
})();
