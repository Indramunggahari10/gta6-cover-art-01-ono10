// Fixed scenes for screenshots. Query params drive the whole scene:
//
//   ?shot=editor|cover          editor = the app, cover = the cover alone
//   &layout=trio|quad|strips    which layout to show
//   &size=1080x1080|1080x1350|1920x1080
//   &photo=<sample>             sample photo for panel 0
//   &photo2=<sample>            sample photo for panel 1
//   &photo3=<sample>            sample photo for panel 2
//   &photo4=<sample>            sample photo for panel 3 (Four-Up only)
//   &caption=<words>            caption text
//   &tagline=<words>            tagline text (optional)
//   &grade=sunset|neon|dusk     colour grade
//
// window.__shotReady is set once the cover has painted, so a screenshot
// tool knows when to capture.
export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (query.get('layout')) api.setLayout(query.get('layout'));
  if (query.get('size')) api.setSize(query.get('size'));
  if (query.get('grade')) api.setGrade(query.get('grade'));
  if (query.get('caption')) api.setCaption(query.get('caption'));
  if (query.get('tagline')) api.setTagline(query.get('tagline'));
  const photos = [query.get('photo'), query.get('photo2'), query.get('photo3'), query.get('photo4')];
  for (let i = 0; i < photos.length; i += 1) {
    if (photos[i]) await api.loadSample(photos[i], i);
  }
  if (shot === 'cover') fitCoverToViewport();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (shot === 'cover') fitCoverToViewport();
    window.__shotReady = true;
  }));
}

// In cover-only mode the canvas keeps its export aspect ratio and is fitted
// inside the viewport, so a portrait or wide cover is never cropped.
function fitCoverToViewport() {
  const canvas = document.getElementById('cover');
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ar = canvas.width / canvas.height;
  let w = vw;
  let h = w / ar;
  if (h > vh) {
    h = vh;
    w = h * ar;
  }
  canvas.style.width = `${Math.floor(w)}px`;
  canvas.style.height = `${Math.floor(h)}px`;
}
