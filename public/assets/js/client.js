const _ReadImage = async () => {
  let f = document.querySelector("#file");
  if (f.files && f.files[0]) {
    const file = f.files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      return alert('Tipo de archivo no soportado');
    }

    const formData = new FormData();
    formData.append('bgImage', file);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        
        const timestamp = new Date().getTime();
        document.body.style.backgroundImage = `url(${data.imageUrl}?t=${timestamp})`;
        
        document.body.offsetHeight;

      } else {
        const errorText = await response.text();
        alert(`Error del servidor: ${errorText}`);
      }
    } catch (err) {
      alert(`Error al subir la imagen: ${err.message}`);
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#file").addEventListener("change", _ReadImage);
});


  document.addEventListener('DOMContentLoaded', async () => {

  try {
    const response = await fetch('assets/uploads/background.jpg');
    if (response.ok) {

      document.body.style.backgroundImage = 'url(/uploads/background.jpg)';
      //document.body.style.backgroundImage = 'url(/assets/uploads/default.jpg)';
      const savedVertical = localStorage.getItem('backgroundPositionVertical') || '50';
      const savedHorizontal = localStorage.getItem('backgroundPositionHorizontal') || '50';
      let savedZoom = localStorage.getItem('backgroundZoom') || '100';
      
      const containerWidth = document.body.offsetWidth;
      const containerHeight = document.body.offsetHeight;
      const imageWidth = (savedZoom / 100) * containerWidth;
      const imageHeight = (savedZoom / 100) * containerHeight;

      if (imageWidth < containerWidth || imageHeight < containerHeight) {
        const widthZoom = (containerWidth / imageWidth) * savedZoom;
        const heightZoom = (containerHeight / imageHeight) * savedZoom;
        savedZoom = Math.max(widthZoom, heightZoom);
      }

      document.body.style.backgroundPosition = `${savedHorizontal}% ${savedVertical}%`;
      document.body.style.backgroundSize = `${savedZoom}%`;
      localStorage.setItem('backgroundZoom', savedZoom);
      document.getElementById('bgZoom').value = savedZoom;

    }
  } catch (err) {}
});

const offcanvasElement = document.querySelector('[data-bs-theme="dark"].offcanvas');
const setOpacity = (opacity) => {

if (offcanvasElement) {
  offcanvasElement.style.backgroundColor = `rgba(32,36,41, ${opacity})`;
}};

const ranges = document.querySelectorAll('input[type="range"]');
ranges.forEach(range => {
  range.addEventListener('input', () => {
    setOpacity(0.1);
  });
  range.addEventListener('change', () => {
    setOpacity(1);
  });
});

document.getElementById('bgVerticalPos').addEventListener('input', function() {

  const verticalValue = this.value;
  localStorage.setItem('backgroundPositionVertical', verticalValue);
  const horizontalValue = localStorage.getItem('backgroundPositionHorizontal') || '50';
  document.body.style.backgroundPosition = `${horizontalValue}% ${verticalValue}%`;

});

document.getElementById('bgHorizontalPos').addEventListener('input', function() {

  const horizontalValue = this.value;
  localStorage.setItem('backgroundPositionHorizontal', horizontalValue);
  const verticalValue = localStorage.getItem('backgroundPositionVertical') || '50';
  document.body.style.backgroundPosition = `${horizontalValue}% ${verticalValue}%`;

});

document.getElementById('bgZoom').addEventListener('input', function () {

  const zoomValue = parseInt(this.value, 10);
  const containerWidth = document.body.offsetWidth;
  const containerHeight = document.body.offsetHeight;
  const imageWidth = (zoomValue / 100) * containerWidth;
  const imageHeight = (zoomValue / 100) * containerHeight;

if (imageWidth < containerWidth || imageHeight < containerHeight) {
  document.body.style.backgroundSize = `cover`;
    } else {
  document.body.style.backgroundSize = `${zoomValue}%`;
}

  localStorage.setItem('backgroundZoom', zoomValue);

});

document.getElementById('bgResetPos').addEventListener('click', function() {
  
  document.getElementById('bgVerticalPos').value = 50;
  document.getElementById('bgHorizontalPos').value = 50;
  document.body.style.backgroundPosition = `50% 50%`;
  localStorage.setItem('backgroundPositionVertical', '50');
  localStorage.setItem('backgroundPositionHorizontal', '50');

});

document.getElementById('bgResetZoom').addEventListener('click', function() {
  
  document.getElementById('bgZoom').value = 100;
  document.body.style.backgroundSize = `100%`;
  localStorage.setItem('backgroundZoom', '100');
  
});

document.getElementById('bgReset').addEventListener('click', async function() {
  try {

    document.body.style.backgroundImage = 'linear-gradient(0deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(../uploads/default.jpg)';

    await fetch('/BGDEL', {
      method: 'DELETE',
    });

  } catch (err) {}
});

document.getElementById('bgResetAll').addEventListener('click', async function() {

  document.getElementById('bgZoom').value = 100;
  document.body.style.backgroundSize = `100%`;
  localStorage.setItem('backgroundZoom', '100');

  document.getElementById('bgVerticalPos').value = 50;
  document.getElementById('bgHorizontalPos').value = 50;
  document.body.style.backgroundPosition = `50% 50%`;
  localStorage.setItem('backgroundPositionVertical', '50');
  localStorage.setItem('backgroundPositionHorizontal', '50');


  try {

    document.body.style.backgroundImage = 'linear-gradient(0deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(../uploads/default.jpg)';

    await fetch('/BGDEL', {
      method: 'DELETE',
    });

  } catch (err) {}

  setTimeout(() => {
    document.getElementById('bgReset').click();
  }, 1500);

});

document.getElementById('helpBtn').addEventListener('click', function() {
  
  window.location.href = '/help'; 

});

document.addEventListener("contextmenu", function (e){
  e.preventDefault();
}, false);




/* function changeLanguage(languageCode) {
    localStorage.setItem('selectedLanguage', languageCode);
  
    Array.from(document.getElementsByClassName('lang')).forEach(function (elem) {
  
      if (elem.classList.contains('lang-' + languageCode)) {
        elem.style.display = 'initial';
  
        document.body.classList.remove('lang-es', 'lang-en', 'lang-de', 'lang-it', 'lang-zh');
        document.body.classList.add('lang-' + languageCode);
  
      } else {
        elem.style.display = 'none';
      }
    });
  }
  
  const selector = document.getElementById('langSelector');
  
  selector.addEventListener('change', function (evt) {
    changeLanguage(this.value);
  });
  
  const savedLang = localStorage.getItem('selectedLanguage') || 'lang-es';
  changeLanguage(savedLang);
  
  
  selector.value = savedLang;
  
  document.getElementById('browserLang').innerText = savedLang;
 */