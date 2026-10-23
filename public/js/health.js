fetch('/health')
  .then((res) => res.json())
  .then((data) => {
    document.getElementById('health').textContent = JSON.stringify(data, null, 2);
  })
  .catch((err) => {
    document.getElementById('health').textContent = `Lỗi: ${err.message}`;
  });
