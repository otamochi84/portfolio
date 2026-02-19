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

// ギャラリー画像の生成と読み込み処理
function setupGallery() {
    const galleryContainer = document.getElementById('gallery-grid');
    if (!galleryContainer) return;

    const maxImages = portfolioConfig.maxImages;
    const imagePromises = [];

    // プレビュー用にPicsum Photosを使用
    const getRandomImage = (index) => `https://picsum.photos/seed/${index + 100}/800/800`;

    // 安全策：画像読み込みに関わらず、最大2.5秒後にアニメーションを強制開始する
    const safetyTimeout = setTimeout(() => {
        startOpeningAnimation();
    }, 2500);

    let isStarted = false;
    const triggerStart = () => {
        if (isStarted) return;
        isStarted = true;
        clearTimeout(safetyTimeout);
        setTimeout(startOpeningAnimation, 500);
    };

    for (let i = 1; i <= maxImages; i++) {
        const promise = new Promise((resolve) => {
            const imgPath = getRandomImage(i);
            const imgObj = new Image();
            imgObj.src = imgPath;
            imgObj.onload = () => {
                resolve({ success: true, index: i, src: imgPath });
            };
            imgObj.onerror = () => {
                resolve({ success: false, index: i, src: "" });
            };
        });
        imagePromises.push(promise);
    }

    // 画像読み込み完了後にアニメーション開始
    Promise.all(imagePromises).then((results) => {
        results.forEach(result => {
            if (result.success) {
                createGalleryItem(result.index, result.src, galleryContainer);
            }
        });
        triggerStart();
    }).catch(() => {
        triggerStart();
    });
}

function createGalleryItem(index, src, container) {
    const div = document.createElement('div');
    div.className = `gallery-item link-hover-target`;
    div.innerHTML = `
        <img src="${src}" alt="Work ${index}" loading="lazy">
        <div class="gallery-overlay"></div>
        <div class="gallery-caption">
            <span class="view-btn">VIEW</span>
        </div>
    `;
    container.appendChild(div);
    div.addEventListener('click', () => openModal(src));
}

// オープニングアニメーション
function startOpeningAnimation() {
    const loader = document.getElementById('loader');
    if (!loader || loader.style.display === 'none') return;

    const tl = anime.timeline({ easing: 'easeOutExpo' });

    const isMobile = window.innerWidth <= 768;
    const bgOpacity = isMobile ? 0.08 : 0.15;

    tl
        .add({
            targets: '.loader-text',
            translateY: [100, 0], opacity: [0, 1], duration: 800
        })
        .add({
            targets: '#loader',
            translateY: -window.innerHeight, duration: 1000, easing: 'easeInOutExpo', delay: 400
        })
        .add({
            targets: '#loader',
            duration: 1,
            complete: function () {
                document.getElementById('loader').style.display = 'none';
            }
        })
        .add({
            targets: '.parallax-bg',
            opacity: [0, bgOpacity],
            duration: 1500,
        }, '-=800')
        .add({
            targets: '.brand-welcome',
            translateY: [30, 0],
            opacity: [0, 1],
            duration: 1000,
            easing: 'easeOutQuart'
        }, '-=1200')
        .add({
            targets: '.reveal-text span',
            translateY: ['100%', '0%'],
            opacity: [0, 1],
            duration: 1000,
            delay: anime.stagger(40),
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
            translateY: [20, 0],
            opacity: [0, 1],
            duration: 800,
            delay: anime.stagger(100),
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

// モーダル制御
const modal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-image');

function openModal(src) {
    if (!modal || !modalImg) return;
    modalImg.src = src;
    modal.style.display = 'flex';
    anime.timeline({ easing: 'easeOutExpo' })
        .add({ targets: modal, opacity: [0, 1], duration: 400 })
        .add({ targets: modalImg, scale: [0.95, 1], opacity: [0, 1], duration: 600 }, '-=300');
    document.body.style.overflow = 'hidden';
}

window.closeModal = function () {
    if (!modal || !modalImg) return;
    anime.timeline({
        easing: 'easeInQuad',
        complete: () => {
            modal.style.display = 'none';
            modalImg.src = '';
            document.body.style.overflow = '';
        }
    })
        .add({ targets: modalImg, scale: 0.95, opacity: 0, duration: 300 })
        .add({ targets: modal, opacity: 0, duration: 300 }, '-=200');
};
