/* ===== 기본 콘텐츠는 모두 HTML에 있습니다. 이 파일은 메뉴와 현재 위치만 제어합니다. ===== */
'use strict';
document.documentElement.classList.add('js-enabled');

/* ===== 모바일 상단 메뉴 ===== */
const menuButton = document.querySelector('.menu-toggle');
const headerNav = document.querySelector('.header-nav');
function closeMenu() {
  headerNav?.classList.remove('is-open');
  menuButton?.setAttribute('aria-expanded', 'false');
}
menuButton?.addEventListener('click', () => {
  const isOpen = headerNav.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});
headerNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && headerNav?.classList.contains('is-open')) {
    closeMenu();
    menuButton?.focus();
  }
});

/* ===== 목차: 스크롤 위치와 접근성 상태 표시 ===== */
const toc = document.querySelector('.toc');
const csNav = document.querySelector('.cs-nav');
const tocLinks = Array.from(document.querySelectorAll('.toc a[href^="#"], .cs-nav a[href^="#"]'));
const headings = tocLinks.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1)))).filter(Boolean);
const tocDetails = toc?.querySelector('details');
const smallScreen = window.matchMedia('(max-width: 740px)');
const setTocLayout = () => {
  if (tocDetails) tocDetails.open = !smallScreen.matches;
  closeMenu();
};
setTocLayout();
smallScreen.addEventListener('change', setTocLayout);
tocLinks.forEach(link => link.addEventListener('click', () => {
  if (smallScreen.matches && tocDetails) tocDetails.open = false;
}));
let scheduled = false;
function updateLocation() {
  const offset = (smallScreen.matches ? 145 : 120) + (csNav ? csNav.offsetHeight : 0);
  let active = headings[0];
  for (const heading of headings) {
    if (heading.getBoundingClientRect().top <= offset) active = heading;
    else break;
  }
  tocLinks.forEach(link => {
    if (active && decodeURIComponent(link.hash.slice(1)) === active.id) {
      if (csNav && !link.hasAttribute('aria-current')) {
        /* 가로 바로가기 줄에서 현재 칩이 보이도록 옆으로만 이동 */
        const list = link.closest('ol');
        list.scrollTo({ left: link.offsetLeft - list.clientWidth / 2 + link.offsetWidth / 2, behavior: 'smooth' });
      }
      link.setAttribute('aria-current', 'location');
    } else link.removeAttribute('aria-current');
  });
  scheduled = false;
}
if (headings.length) {
  window.addEventListener('scroll', () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateLocation);
    }
  }, { passive: true });
  window.addEventListener('resize', updateLocation);
  window.addEventListener('load', updateLocation);
  updateLocation();
}

/* ===== 대표작 썸네일: 화면 캡처를 차례로 넘기고, 화면 밖에서는 멈춤 ===== */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll('[data-slideshow]').forEach(show => {
  const slides = Array.from(show.children);
  if (slides.length < 2) return;
  let index = 0;
  let timer = null;
  const next = () => {
    slides[index].classList.remove('is-active');
    index = (index + 1) % slides.length;
    slides[index].classList.add('is-active');
  };
  const start = () => { if (!timer && !reduceMotion.matches) timer = setInterval(next, 3200); };
  const stop = () => { clearInterval(timer); timer = null; };
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(show);
});

/* ===== 프로젝트 화면 갤러리: 분야 탭 · 좌우 버튼 ===== */
document.querySelectorAll('[data-gallery]').forEach(gallery => {
  const track = gallery.querySelector('.cs-track');
  const cards = Array.from(track.children);
  const tabs = Array.from(gallery.querySelectorAll('.cs-tab'));
  const [prev, next] = gallery.querySelectorAll('.cs-arrow');
  const sync = () => {
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  };
  const step = () => (cards.find(card => !card.hidden)?.offsetWidth || 300) + 16;
  [prev, next].forEach((button, i) => button.addEventListener('click', () => {
    track.scrollBy({ left: step() * (i ? 1 : -1), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }));
  const applyFilter = tab => {
    tabs.forEach(other => other.setAttribute('aria-pressed', String(other === tab)));
    cards.forEach(card => { card.hidden = tab.dataset.filter !== 'all' && card.dataset.category !== tab.dataset.filter; });
    track.scrollLeft = 0;
    sync();
  };
  tabs.forEach(tab => tab.addEventListener('click', () => applyFilter(tab)));
  track.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  const initialTab = tabs.find(tab => tab.getAttribute('aria-pressed') === 'true');
  if (initialTab) applyFilter(initialTab); else sync();
});

/* ===== 스크린샷 크게 보기: 새 탭 대신 화면 위에 띄움 (Ctrl · ⌘ 클릭은 새 탭) ===== */
const zoomLinks = document.querySelectorAll('a.cs-zoom, a.image-link');
if (zoomLinks.length && typeof HTMLDialogElement === 'function') {
  const viewer = document.createElement('dialog');
  viewer.className = 'lightbox';
  viewer.setAttribute('aria-label', '스크린샷 크게 보기');
  viewer.innerHTML = '<img alt=""><p class="lightbox-caption"></p><button class="lightbox-close" type="button" aria-label="닫기">×</button>';
  document.body.append(viewer);
  const [image, caption, closeButton] = viewer.children;
  zoomLinks.forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    const thumb = link.querySelector('img');
    image.src = link.href;
    image.alt = thumb?.alt || '';
    caption.textContent = link.dataset.caption || thumb?.alt || '';
    viewer.showModal();
  }));
  closeButton.addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
}

/* ===== 화면 묶음 보기: 국가 카드를 누르면 그 나라의 모든 탭을 위쪽 탭 · 좌우 버튼 · 방향키로 넘겨 봄 ===== */
const screenSets = document.querySelectorAll('[data-screen-set]');
if (screenSets.length && typeof HTMLDialogElement === 'function') {
  const setViewer = document.createElement('dialog');
  setViewer.className = 'lightbox set-viewer';
  setViewer.innerHTML = '<div class="set-viewer-tabs" role="tablist"></div><div class="set-viewer-stage"><img alt=""><button class="set-viewer-arrow" type="button" data-step="-1" aria-label="이전 화면">‹</button><button class="set-viewer-arrow" type="button" data-step="1" aria-label="다음 화면">›</button></div><p class="lightbox-caption"></p><button class="lightbox-close" type="button" aria-label="닫기">×</button>';
  document.body.append(setViewer);
  const tabBar = setViewer.querySelector('.set-viewer-tabs');
  const setImage = setViewer.querySelector('img');
  const setCaption = setViewer.querySelector('.lightbox-caption');
  let items = [];
  let current = 0;
  const showItem = next => {
    current = (next + items.length) % items.length;
    const item = items[current];
    setImage.src = item.href;
    setImage.alt = item.textContent;
    setCaption.textContent = `${current + 1} / ${items.length} · ${item.dataset.caption || ''}`;
    Array.from(tabBar.children).forEach((tab, i) => tab.setAttribute('aria-selected', String(i === current)));
  };
  screenSets.forEach(set => {
    const card = set.querySelector('.cs-shot');
    const links = Array.from(set.querySelectorAll('.cs-set-list a'));
    card.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      items = links;
      setViewer.setAttribute('aria-label', `${card.querySelector('b').textContent} 화면 보기`);
      tabBar.replaceChildren(...links.map((link, i) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.setAttribute('role', 'tab');
        tab.textContent = link.textContent;
        tab.addEventListener('click', () => showItem(i));
        return tab;
      }));
      showItem(0);
      setViewer.showModal();
    });
  });
  setViewer.querySelectorAll('.set-viewer-arrow').forEach(button => button.addEventListener('click', () => showItem(current + Number(button.dataset.step))));
  setViewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') showItem(current - 1);
    if (event.key === 'ArrowRight') showItem(current + 1);
  });
  setViewer.querySelector('.lightbox-close').addEventListener('click', () => setViewer.close());
  setViewer.addEventListener('click', event => { if (event.target === setViewer) setViewer.close(); });
}

/* ===== 작업 대시보드: 타일을 누르면 data-open과 같은 id의 상세 창을 띄움 ===== */
document.querySelectorAll('[data-open]').forEach(tile => {
  const sheet = document.getElementById(tile.dataset.open);
  if (!sheet || typeof sheet.showModal !== 'function') return;
  tile.addEventListener('click', () => sheet.showModal());
  sheet.querySelector('.detail-close').addEventListener('click', () => sheet.close());
  /* 바깥 어두운 부분을 누르면 닫힘 */
  sheet.addEventListener('click', event => { if (event.target === sheet) sheet.close(); });
});

/* ===== 개인 작업 썸네일: 버튼 · 점 · 사진 클릭으로 사이트의 다른 화면 넘겨 보기 ===== */
document.querySelectorAll('[data-shots]').forEach(media => {
  const slides = Array.from(media.querySelectorAll('.labs-shots img'));
  const nav = media.querySelector('.shot-nav');
  if (slides.length < 2) {
    nav.remove();
    return;
  }
  const dots = slides.map(() => document.createElement('i'));
  media.querySelector('.shot-dots').append(...dots);
  let index = 0;
  const show = next => {
    slides[index].classList.remove('is-active');
    dots[index].classList.remove('is-active');
    index = (next + slides.length) % slides.length;
    slides[index].classList.add('is-active');
    dots[index].classList.add('is-active');
  };
  dots[0].classList.add('is-active');
  nav.querySelectorAll('.shot-arrow').forEach(button => button.addEventListener('click', () => show(index + Number(button.dataset.step))));
  media.querySelector('.labs-shots').addEventListener('click', () => show(index + 1));
});

/* ===== 영상 · 미디어 활동: 화면 위에서 재생, 닫으면 멈춤 (Ctrl · ⌘ 클릭은 YouTube 새 탭) ===== */
const mediaCards = document.querySelectorAll('.media-card[data-video]');
if (mediaCards.length && typeof HTMLDialogElement === 'function') {
  const player = document.createElement('dialog');
  player.className = 'media-player';
  player.setAttribute('aria-label', '영상 보기');
  player.innerHTML = '<div class="media-player-frame"></div><div class="media-player-bar"><p class="media-player-title"></p><a target="_blank" rel="noopener noreferrer">YouTube에서 보기 ↗<span class="sr-only"> (새 탭)</span></a><button class="media-player-close" type="button" aria-label="닫기">×</button></div>';
  document.body.append(player);
  const frame = player.querySelector('.media-player-frame');
  const title = player.querySelector('.media-player-title');
  const youtubeLink = player.querySelector('a');
  mediaCards.forEach(card => card.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${card.dataset.video}?autoplay=1&rel=0&playsinline=1`;
    iframe.title = card.querySelector('strong').textContent;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    frame.replaceChildren(iframe);
    title.innerHTML = '<small></small>';
    title.firstChild.textContent = card.querySelector('.media-tag').textContent;
    title.append(iframe.title);
    youtubeLink.href = card.href;
    player.showModal();
  }));
  player.querySelector('.media-player-close').addEventListener('click', () => player.close());
  player.addEventListener('click', event => { if (event.target === player) player.close(); });
  /* 닫으면 iframe을 지워 소리가 계속 나지 않게 함 */
  player.addEventListener('close', () => frame.replaceChildren());
}
/* ===== 3장 요약 보기: 버튼 · 주소 #summary 로 열고, 방향키 · 점 · 스와이프로 넘김 ===== */
document.querySelectorAll('dialog.deck').forEach(deck => {
  if (typeof deck.showModal !== 'function') return;
  const track = deck.querySelector('.deck-track');
  const slides = Array.from(track.children);
  const dots = Array.from(deck.querySelectorAll('.deck-dots button'));
  const [prev, next] = deck.querySelectorAll('.deck-nav');
  const count = deck.querySelector('.deck-count');
  let current = 0;
  const show = index => {
    current = Math.max(0, Math.min(slides.length - 1, index));
    track.style.transform = `translateX(${-100 * current}%)`;
    slides.forEach((slide, i) => { slide.inert = i !== current; });
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === current)));
    prev.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    count.textContent = `${current + 1} / ${slides.length}`;
    slides[current].scrollTop = 0;
  };
  const open = () => {
    show(0);
    deck.showModal();
    if (location.hash !== `#${deck.id}`) history.replaceState(null, '', `#${deck.id}`);
  };
  document.querySelectorAll(`[data-deck-open="${deck.id}"]`).forEach(button => button.addEventListener('click', open));
  prev.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
  deck.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
  });
  /* 모바일: 좌우로 밀어서 넘김 (세로 스크롤은 그대로) */
  let startX = 0;
  let startY = 0;
  track.addEventListener('touchstart', event => { startX = event.touches[0].clientX; startY = event.touches[0].clientY; }, { passive: true });
  track.addEventListener('touchend', event => {
    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
  deck.querySelector('.deck-close').addEventListener('click', () => deck.close());
  deck.addEventListener('click', event => { if (event.target === deck) deck.close(); });
  /* 메인 카드의 "3장 요약 보기"(?from=home)로 열었으면, 닫을 때 메인으로 돌아감 */
  const params = new URLSearchParams(location.search);
  let fromHome = params.get('from') === 'home';
  deck.addEventListener('close', () => {
    if (fromHome) {
      const ref = document.referrer && new URL(document.referrer);
      if (ref && ref.origin === location.origin && /\/(index\.html)?$/.test(ref.pathname)) history.back();
      else location.href = '../index.html#projects';
      return;
    }
    if (location.hash === `#${deck.id}`) history.replaceState(null, '', location.pathname);
  });
  /* 마지막 장의 "상세 내용 보기": 창을 닫고 본문으로 이동 (메인으로 돌아가지 않음) */
  deck.querySelector('.deck-more')?.addEventListener('click', () => {
    fromHome = false;
    deck.close();
    document.getElementById(deck.querySelector('.deck-more').dataset.target)?.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });
  if (location.hash === `#${deck.id}`) open();
});

/* ===== 화면 둘러보기 뷰포트: 썸네일 · 좌우 버튼 · 방향키로 큰 화면 전환 ===== */
document.querySelectorAll('[data-viewport]').forEach(viewport => {
  const thumbs = Array.from(viewport.querySelectorAll('.vp-thumb'));
  if (!thumbs.length) return;
  const screen = viewport.querySelector('.vp-screen');
  const image = viewport.querySelector('.vp-image');
  const title = viewport.querySelector('.vp-title');
  const desc = viewport.querySelector('.vp-desc');
  const path = viewport.querySelector('.vp-path');
  const index = viewport.querySelector('.vp-index');
  const strip = viewport.querySelector('.vp-thumbs');
  let current = Math.max(0, thumbs.findIndex(t => t.getAttribute('aria-pressed') === 'true'));
  const show = next => {
    current = (next + thumbs.length) % thumbs.length;
    const t = thumbs[current];
    thumbs.forEach(other => other.setAttribute('aria-pressed', String(other === t)));
    if (image.getAttribute('src') !== t.dataset.src) {
      image.classList.add('is-loading');
      image.onload = () => image.classList.remove('is-loading');
      image.src = t.dataset.src;
    }
    image.alt = t.dataset.title;
    screen.href = t.dataset.src;
    screen.dataset.caption = t.dataset.title;
    title.textContent = t.dataset.title;
    desc.textContent = t.dataset.desc;
    path.textContent = t.dataset.url;
    index.textContent = current + 1;
    /* 썸네일 줄만 가로로 스크롤 (페이지는 움직이지 않음) */
    const li = t.parentElement;
    const left = li.offsetLeft - (strip.clientWidth - li.offsetWidth) / 2;
    strip.scrollTo({ left, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  };
  thumbs.forEach((t, i) => t.addEventListener('click', () => show(i)));
  viewport.querySelectorAll('.vp-arrow').forEach(b => b.addEventListener('click', () => show(current + Number(b.dataset.step))));
  viewport.querySelector('.vp').addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
  });
});
