// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the cover alone. `photo` picks the sample
// (samples/<photo>.png) and `caption` the words. window.__shotReady is set
// once the cover has painted, so a screenshot tool knows when to capture.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await load(query.get('photo') ?? 'sunset-boulevard', query.get('caption') ?? 'Sunset Heist');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
