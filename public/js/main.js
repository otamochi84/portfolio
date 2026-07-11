/**
 * =================================================================================
 * プログラム本体
 * =================================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    setupContent();
    setupGallery();
    // ローダーを廃止したため、DOM準備直後にヒーロー登場アニメを開始する
    startOpeningAnimation();
});

// カスタムカーソル初期化
function setupContent() {
    initCursor();
}

// ギャラリー画像の生成（ローダー連動を廃止）
function setupGallery() {
    const galleryContainer = document.getElementById('gallery-grid');
    if (!galleryContainer) return;

    const items = window.notionDataFromAstro || [];
    items.forEach((item, index) => {
        createGalleryItem(index, item, galleryContainer);
    });
}

function createGalleryItem(index, workData, container) {
    const div = document.createElement('div');
    div.className = `gallery-item link-hover-target`;
    div.innerHTML = `
        <img src="${workData.thumbnail}" alt="${workData.title}" loading="lazy">
        <div class="gallery-overlay"></div>
        <div class="gallery-caption"><span class="view-btn">VIEW</span></div>
    `;
    container.appendChild(div);
    div.addEventListener('click', () => openModal(workData.thumbnail, workData));
}

// オープニングアニメーション（ヒーロー強化版・ローダーなし）
function startOpeningAnimation() {
    const tl = anime.timeline({ easing: 'easeOutExpo' });

    const isMobile = window.innerWidth <= 768;
    const bgOpacity = isMobile ? 0.08 : 0.15;

    tl
        // 背景の巨大文字「ota / mochi」をドリフトインさせる
        .add({
            targets: '.parallax-bg',
            opacity: [0, bgOpacity * 1.4],
            translateX: [80, 0],
            scale: [1.1, 1],
            duration: 1800,
        })
        .add({
            targets: '.brand-welcome',
            translateY: [40, 0],
            opacity: [0, 1],
            duration: 1100,
            easing: 'easeOutQuart'
        }, '-=1400')
        .add({
            targets: '.reveal-text span',
            translateY: ['100%', '0%'],
            opacity: [0, 1],
            duration: 1000,
            delay: anime.stagger(70),
        }, '-=800')
        .add({
            targets: '.user-subtitle',
            translateY: [20, 0],
            opacity: [0, 1],
            duration: 800,
            easing: 'easeOutQuad'
        }, '-=600')
        .add({
            targets: '.line-anim',
            scaleX: [0, 1], duration: 800,
        }, '-=700')
        .add({
            targets: ['.copy-line', '.copy-line-accent'],
            translateY: [30, 0],
            opacity: [0, 1],
            duration: 900,
            delay: anime.stagger(140),
            easing: 'easeOutQuad'
        }, '-=600')
        .add({
            targets: '.scroll-indicator',
            translateY: [20, 0],
            opacity: [0, 0.6],
            duration: 800,
            complete: function () {
                const scrollInd = document.querySelector('.scroll-indicator');
                if (scrollInd) scrollInd.style.animation = 'bounce-slow 2s infinite';
            }
        }, '-=400')
        .finished.then(() => {
            initScrollAnimations();
        });
}

// スクロール連動アニメーション
function initScrollAnimations() {
    const parallaxBg = document.querySelector('.parallax-bg');
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        const speed = 0.2;
        window.requestAnimationFrame(() => {
            if (parallaxBg) {
                parallaxBg.style.transform = `translateY(${scrolled * speed}px)`;
            }
        });
    });

    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => {
                    entry.target.classList.add('is-visible');
                }, index * 100);
                obs.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const items = document.querySelectorAll('.gallery-item');
    items.forEach(item => observer.observe(item));
}

// カスタムカーソル制御
function initCursor() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const cursor = document.getElementById('custom-cursor');

    if (isTouch) {
        if (cursor) cursor.style.display = 'none';
        return;
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateCursor() {
        const lerpFactor = 0.15;
        cursorX += (mouseX - cursorX) * lerpFactor;
        cursorY += (mouseY - cursorY) * lerpFactor;

        if (cursor) {
            cursor.style.transform = `translate(${cursorX}px, ${cursorY}px) translate(-50%, -50%)`;
        }
        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    document.addEventListener('mouseover', (e) => {
        if (!cursor) return;
        if (e.target.closest('.link-hover-target') || e.target.closest('a') || e.target.closest('button') || e.target.closest('.close-btn')) {
            cursor.classList.add('hovered');
        } else {
            cursor.classList.remove('hovered');
        }
    });
}

// モーダル制御の変数定義を変更
const modal = document.getElementById('content-modal');
const modalCard = document.querySelector('.modal-card');
const modalImg = document.getElementById('modal-card-image');
const modalTitle = document.getElementById('modal-card-title');
const modalClient = document.getElementById('modal-card-client');
const modalCategory = document.getElementById('modal-card-category');
const modalTools = document.getElementById('modal-card-tools');
const modalDesc = document.getElementById('modal-card-desc');
const modalLink = document.getElementById('modal-card-link');
const modalDetailLink = document.getElementById('modal-card-detail');

function openModal(src, data) {
    modalImg.src = src;
    modalTitle.innerText = data.title || "";
    modalClient.innerText = data.client || "";
    modalCategory.innerText = data.category || "";
    modalDesc.innerText = data.overview || "";

    modalTools.innerHTML = '';
    if (data.tools && data.tools.length > 0) {
        data.tools.forEach(tool => {
            const span = document.createElement('span');
            span.className = 'modal-card-tool-badge';
            span.innerText = tool;
            modalTools.appendChild(span);
        });
    }

    // 外部リンク（externalUrl）の出し分け
    if (data.externalUrl) {
        modalLink.href = data.externalUrl;
        modalLink.style.display = 'inline-flex';
    } else {
        modalLink.style.display = 'none';
    }

    // 詳しく見るリンク（slug）の出し分け
    if (data.slug) {
        modalDetailLink.href = `/works/${data.slug}/`;
        modalDetailLink.style.display = 'inline-flex';
    } else {
        modalDetailLink.style.display = 'none';
    }

    modal.style.display = 'flex';
    anime.timeline({ easing: 'easeOutExpo' })
        .add({ targets: modal, opacity: [0, 1], duration: 400 })
        .add({ targets: modalCard, scale: [0.95, 1], translateY: [20, 0], opacity: [0, 1], duration: 500 }, '-=300');
    document.body.style.overflow = 'hidden';
}

window.closeModal = function (e) {
    if (e) e.stopPropagation();
    anime.timeline({
        easing: 'easeInQuad',
        complete: () => {
            modal.style.display = 'none';
            modalImg.src = '';
            document.body.style.overflow = '';
        }
    })
        .add({ targets: modalCard, scale: 0.95, translateY: 10, opacity: 0, duration: 250 })
        .add({ targets: modal, opacity: 0, duration: 300 }, '-=150');
};
