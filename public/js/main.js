/**
 * =================================================================================
 * 【かんたん設定エリア】
 * =================================================================================
 */
const portfolioConfig = {
    name: "Ryota Ohashi",
    role: "otamochi",
    bio: "Notion Architect / Template Creator \nbased in Nara, Japan.",

    freeTextTitle: "About",
    freeTextBodyEn: "I specialize in designing custom operational systems for small and medium-sized businesses,\nincluding database design, automations, and integrations.\n\nMy goal is to help teams work smarter with tools that fit their unique workflows.",
    freeTextBodyJp: "中小企業や個人の方を中心に、\n「Notionを入れてみたけどうまく使えていない」\n「これから導入を検討している」\nという方のお手伝いをしています。\n\nNotionは、仕事で使ういろんな道具をひとつにまとめられるツールです。\n\n「情報がバラバラで探しにくい」\n「Excelやスプレッドシートの管理が限界」\n——Notionを使えばそんな悩みを解決できます。\n\nタスク管理、日報、顧客管理、社内wikiなど、必要な情報をNotionでひとつにまとめ、\n無理なく使い続けられる仕組みを設計・構築します。\n\nまずはお気軽にご相談ください。",

    maxImages: 12, // 枚数を調整
    imageExtension: ".jpg",

    links: [
        { label: "Template ", url: "https://www.notion.com/ja/@otamochi" },
        { label: "X (Twitter)", url: "https://x.com/Otamochi84" },
        { label: "LINE", url: "https://lin.ee/CPoxhA7" },
        { label: "Email", url: "mailto:hello@otamochi.com" }
    ]
};

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

// テキストやリンクの流し込み
function setupContent() {
    const nameEl = document.getElementById('user-name');
    if (nameEl) {
        nameEl.innerHTML = portfolioConfig.name.split(' ').map(word =>
            `<span class="reveal-text"><span>${word}</span></span>`
        ).join(' ');
    }

    const roleEl = document.getElementById('nav-role-text');
    if (roleEl) roleEl.innerText = portfolioConfig.role;

    const bioEl = document.getElementById('user-bio');
    if (bioEl) bioEl.innerText = portfolioConfig.bio;

    const copyrightEl = document.getElementById('copyright');
    if (copyrightEl) copyrightEl.innerHTML = `&copy; ${new Date().getFullYear()} ${portfolioConfig.role}`;

    const freeTitleEl = document.getElementById('free-text-title');
    if (freeTitleEl) freeTitleEl.innerText = portfolioConfig.freeTextTitle;

    const freeEnEl = document.getElementById('free-text-body-en');
    if (freeEnEl) freeEnEl.innerText = portfolioConfig.freeTextBodyEn;

    const freeJpEl = document.getElementById('free-text-body-jp');
    if (freeJpEl) freeJpEl.innerText = portfolioConfig.freeTextBodyJp;

    // リンク生成
    const linksContainer = document.getElementById('links-list');
    if (linksContainer) {
        linksContainer.innerHTML = '';
        portfolioConfig.links.forEach(link => {
            linksContainer.innerHTML += `
                <li class="link-item">
                    <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="link-anchor link-hover-target">
                        <span class="link-label">${link.label}</span>
                        <span class="link-arrow">OPEN ↗</span>
                    </a>
                </li>
            `;
        });
    }

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

    if (data.url) {
        modalLink.href = data.url;
        modalLink.style.display = 'inline-flex';
    } else {
        modalLink.style.display = 'none';
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
