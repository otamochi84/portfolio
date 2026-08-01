/**
 * =================================================================================
 * プログラム本体
 * =================================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    setupIntro();
    setupNavToggle();
    setupGallery();
    initScrollAnimations();
});

// イントロ（ロード画面）の後始末
// 表示・アニメーションはCSS側で完結するが、アニメーションが走らない環境で
// パネルが residual に残り操作を妨げないよう、DOMから取り除いておく
function setupIntro() {
    const intro = document.querySelector('.intro');
    if (!intro) return;

    const removeIntro = () => intro.remove();

    // パネル本体のアニメーション終了で除去（子要素のイベントは無視する）
    intro.addEventListener('animationend', (e) => {
        if (e.target === intro) removeIntro();
    });

    // アニメーションが発火しない環境向けのフォールバック
    setTimeout(removeIntro, 4000);
}

// モバイル用ナビゲーション（ハンバーガーメニュー）の開閉
// 開閉状態は aria-expanded を唯一の情報源とし、見た目はCSS側で追従させる
function setupNavToggle() {
    const nav = document.querySelector('.site-nav');
    const toggle = document.querySelector('.site-nav-toggle');
    const panel = document.getElementById('site-nav-links');
    if (!nav || !toggle || !panel) return;

    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    const openNav = () => {
        panel.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
    };

    const closeNav = () => {
        panel.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
        if (isOpen()) {
            closeNav();
        } else {
            openNav();
        }
    });

    // リンクをタップしたら閉じる（アンカー移動先がメニューで隠れないようにする）
    panel.querySelectorAll('.site-nav-link').forEach((link) => {
        link.addEventListener('click', closeNav);
    });

    // メニュー外をタップしたら閉じる（ナビ内のタップは対象外）
    // iOS Safariはdocumentへ委譲したclickが拾えない場合があるためpointerdownで受ける
    document.addEventListener('pointerdown', (e) => {
        if (!isOpen()) return;
        if (nav.contains(e.target)) return;
        closeNav();
    });

    // Escapeキーで閉じ、フォーカスを開閉ボタンへ戻す
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !isOpen()) return;
        closeNav();
        toggle.focus();
    });

    // PC幅へ戻したときに開いた状態が残らないようリセットする
    window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => {
        if (e.matches) closeNav();
    });
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

// スクロール連動アニメーション（ギャラリーカードの出現）
function initScrollAnimations() {
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
