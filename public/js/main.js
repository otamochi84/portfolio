/**
 * =================================================================================
 * プログラム本体
 * =================================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    setupGallery();
    // ローダーを廃止したため、DOM準備直後にヒーロー登場アニメを開始する
    startOpeningAnimation();
});

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

    // キーボード操作対応：ボタンとして認識させる
    div.tabIndex = 0;
    div.setAttribute('role', 'button');
    div.setAttribute('aria-label', workData.title);

    // 画像（altやsrcはプロパティ代入でXSS・属性崩れを防ぐ）
    const img = document.createElement('img');
    img.src = workData.thumbnail;
    img.alt = workData.title;
    img.loading = 'lazy';

    // ホバー時の暗転オーバーレイ
    const overlay = document.createElement('div');
    overlay.className = 'gallery-overlay';

    // キャプション（VIEWラベル）
    const caption = document.createElement('div');
    caption.className = 'gallery-caption';
    const viewBtn = document.createElement('span');
    viewBtn.className = 'view-btn';
    viewBtn.textContent = 'VIEW';
    caption.appendChild(viewBtn);

    div.appendChild(img);
    div.appendChild(overlay);
    div.appendChild(caption);
    container.appendChild(div);

    // クリックで開く
    div.addEventListener('click', () => openModal(workData.thumbnail, workData));
    // EnterまたはSpaceでも開く（Spaceは既定のスクロールを抑止）
    div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            if (e.key === ' ') e.preventDefault();
            openModal(workData.thumbnail, workData);
        }
    });
}

// オープニングアニメーション（ヒーロー強化版・ローダーなし）
function startOpeningAnimation() {
    const isMobile = window.innerWidth <= 768;
    const bgOpacity = isMobile ? 0.08 : 0.15;

    // 動きを減らす設定のユーザーには開場アニメーションをスキップし、最終状態で即表示する
    // （CSSで初期状態がopacity:0等になっている要素があるため、放置すると見えないままになる）
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        showHeroInstantly(bgOpacity);
        // スクロールアニメの初期化は行うが、パララックスのscrollリスナーは登録しない
        initScrollAnimations(true);
        return;
    }

    const tl = anime.timeline({ easing: 'easeOutExpo' });

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
        .finished.then(() => {
            initScrollAnimations();
        });
}

// 動きを減らす設定のユーザー向け：ヒーロー各要素を最終状態で即表示する
function showHeroInstantly(bgOpacity) {
    // 各要素のCSS初期値（opacity:0 / transform）を最終状態へ直接上書きする
    const setFinal = (selector, opacity) => {
        document.querySelectorAll(selector).forEach(el => {
            el.style.opacity = opacity;
            el.style.transform = 'none';
        });
    };

    // 背景の巨大文字：最終opacityはモバイル0.08/PC0.15
    setFinal('.parallax-bg', bgOpacity);
    setFinal('.brand-welcome', 1);
    setFinal('.reveal-text span', 1);
    setFinal('.user-subtitle', 1);
    setFinal('.copy-line', 1);
    setFinal('.copy-line-accent', 1);
    // 区切り線：scaleX(0) → scaleX(1) で表示
    document.querySelectorAll('.line-anim').forEach(el => {
        el.style.transform = 'scaleX(1)';
    });
}

// スクロール連動アニメーション
// skipParallax=true のときはパララックスのscrollリスナーを登録しない（reduced-motion対応）
function initScrollAnimations(skipParallax) {
    if (!skipParallax) {
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
    }

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
            // モーダルを閉じた後、開いた元のカードにフォーカスリングが残らないようにする
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        }
    })
        .add({ targets: modalCard, scale: 0.95, translateY: 10, opacity: 0, duration: 250 })
        .add({ targets: modal, opacity: 0, duration: 300 }, '-=150');
};

// モーダル表示中にEscapeキーで閉じられるようにする（モーダルが無いページでは何もしない）
document.addEventListener('keydown', (e) => {
    if (!modal) return;
    if (e.key === 'Escape' && modal.style.display === 'flex') {
        window.closeModal();
    }
});
