/**
 * =================================================================================
 * プログラム本体
 * =================================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    setupIntro();
    setupNavToggle();
    setupSlideshows();
    setupJournalViewall();
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

// 画像スライドショー（キービジュアル・スナップ写真）の自動切替
// 重なりとフェードはCSS側で完結し、ここでは is-active の付け替えだけを行う
function setupSlideshows() {
    const slideshows = document.querySelectorAll('[data-slideshow]');
    if (slideshows.length === 0) return;

    // 動きを減らす設定のユーザーには自動切替せず、1枚目を出したままにする
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const displayDuration = 6000; // 1枚を表示し続ける時間(ms)
    const startInterval = 3000;   // 2枚のスライドショーが同時に切り替わらないようずらす時間(ms)

    slideshows.forEach((slideshow, slideshowIndex) => {
        const slides = slideshow.querySelectorAll('.slide');

        // 1枚だけなら静止画として扱い、タイマーを動かさない
        if (slides.length < 2) return;

        let currentIndex = 0;
        const showNextSlide = () => {
            slides[currentIndex].classList.remove('is-active');
            currentIndex = (currentIndex + 1) % slides.length;
            slides[currentIndex].classList.add('is-active');
        };

        // 開始タイミングをずらしてから一定間隔で切り替える
        setTimeout(() => {
            setInterval(showNextSlide, displayDuration);
        }, startInterval * slideshowIndex);
    });
}

// Journalの横スクロール末尾に置いたVIEW ALLを、画面に入ってきたところで出す
// 見た目はCSS側が持ち、ここは出現の合図（is-visible）だけを担う。
// 監視範囲はビューポート全体にしてある。スクロール枠を基準にすると、
// 横スクロールしていなくても「枠の中に入っている」と判定されてしまうため
function setupJournalViewall() {
    const list = document.querySelector('.jgal-list');
    const item = document.querySelector('.jgal-viewall-item');
    if (!list || !item) return;

    // 監視できない環境では隠さず、出したままにする
    if (!('IntersectionObserver' in window)) return;

    // JSが動いたことを確認できたこの時点で初めて隠す。
    // CSSだけで隠すと、JSが無効・読み込み失敗のときにリンクが永久に見えなくなる
    list.setAttribute('data-observed', '');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            item.classList.add('is-visible');
            // 一度出したら戻さない（スクロールのたびに明滅させない）
            observer.disconnect();
        });
    }, { threshold: 0.4 });

    observer.observe(item);
}
