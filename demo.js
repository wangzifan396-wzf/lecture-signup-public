const practice = document.querySelector('#practice');
let firstEdit = null, clicks = 0;
practice.addEventListener('input', () => {firstEdit ??= performance.now();});
practice.addEventListener('submit', event => {
  event.preventDefault();
  document.querySelector('#confirmation').showModal();
});
document.querySelector('#dismiss').addEventListener('click', () => document.querySelector('#confirmation').close());
document.querySelector('#accept').addEventListener('click', () => {
  clicks++;
  document.querySelector('#confirmation').close();
  const success = document.querySelector('#demo-success'); success.hidden = false; success.textContent = '提交成功';
  const elapsed = firstEdit === null ? '—' : ((performance.now() - firstEdit) / 1000).toFixed(2);
  document.querySelector('#receipt').textContent = `演练完成：收到 ${clicks} 次提交；从首次填写到提交 ${elapsed} 秒。没有发送网络请求。`;
  document.querySelector('#demo-submit').disabled = true;
});
