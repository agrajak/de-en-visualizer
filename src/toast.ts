export default function openToast(orangeText: string, text: string) {
  const body = document.querySelector('body');
  if (!body) return;
  const toasts = document.querySelectorAll('.toast');
  toasts.forEach(toast => {
    body.removeChild(toast)
  });

  const toast = document.createElement('div');

  toast.classList.add('toast')
  toast.classList.add('shadow')

  const orangeSpan = document.createElement('span');
  orangeSpan.classList.add('orange');
  orangeSpan.innerText = orangeText;

  const span = document.createElement('span');
  span.innerText = text;

  toast.appendChild(orangeSpan);
  toast.appendChild(span);


  body.appendChild(toast);
  toast.addEventListener("animationend", () => {
    body.removeChild(toast);
  })
}


