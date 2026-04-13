const TOUR_STYLE_ID = 'driver-brand-overrides';

function injectTourStyles() {
  // Always re-inject to pick up the current theme
  document.getElementById(TOUR_STYLE_ID)?.remove();
  const style = document.createElement('style');
  style.id = TOUR_STYLE_ID;
  const isDark = document.documentElement.classList.contains('dark');

  const bg = isDark ? '#13161d' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)';
  const shadow = isDark
    ? '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
    : '0 16px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)';
  const titleColor = isDark ? '#f1f5f9' : '#0f172a';
  const descColor = isDark ? '#94a3b8' : '#475569';
  const descBoldColor = isDark ? '#cbd5e1' : '#1e293b';
  const progressColor = isDark ? '#475569' : '#94a3b8';
  const prevBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const prevColor = isDark ? '#94a3b8' : '#64748b';
  const prevHoverBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const prevHoverColor = isDark ? '#f1f5f9' : '#0f172a';
  const closeBtnColor = isDark ? '#475569' : '#94a3b8';
  const closeBtnHoverColor = isDark ? '#f1f5f9' : '#0f172a';

  style.textContent = `
    /* Popover shell */
    .driver-popover,
    .driver-popover * {
      font-family: 'Figtree', sans-serif !important;
    }
    .driver-popover {
      background: ${bg} !important;
      border: 1px solid ${border} !important;
      border-radius: 12px !important;
      padding: 20px 20px 16px !important;
      box-shadow: ${shadow} !important;
      max-width: 340px !important;
    }

    /* Arrow */
    .driver-popover-arrow-side-left .driver-popover-arrow  { border-right-color: ${bg} !important; }
    .driver-popover-arrow-side-right .driver-popover-arrow { border-left-color:  ${bg} !important; }
    .driver-popover-arrow-side-top .driver-popover-arrow   { border-bottom-color:${bg} !important; }
    .driver-popover-arrow-side-bottom .driver-popover-arrow{ border-top-color:   ${bg} !important; }

    /* Title */
    .driver-popover-title {
      font-size: 14px !important;
      font-weight: 700 !important;
      color: ${titleColor} !important;
      letter-spacing: 0.01em !important;
      margin-bottom: 8px !important;
    }

    /* Description */
    .driver-popover-description {
      font-size: 12.5px !important;
      line-height: 1.65 !important;
      color: ${descColor} !important;
    }
    .driver-popover-description b,
    .driver-popover-description strong {
      color: ${descBoldColor} !important;
      font-weight: 600 !important;
    }

    /* Progress text */
    .driver-popover-progress-text {
      font-size: 10px !important;
      font-weight: 600 !important;
      letter-spacing: 0.05em !important;
      color: ${progressColor} !important;
      text-transform: uppercase !important;
    }

    /* Footer */
    .driver-popover-footer {
      margin-top: 16px !important;
      gap: 8px !important;
    }

    /* All nav buttons base */
    .driver-popover-prev-btn,
    .driver-popover-next-btn,
    .driver-popover-close-btn {
      border-radius: 7px !important;
      font-size: 11.5px !important;
      font-weight: 600 !important;
      padding: 6px 14px !important;
      border: none !important;
      cursor: pointer !important;
      transition: opacity 0.15s, background 0.15s !important;
      font-family: 'Figtree', sans-serif !important;
      text-shadow: none !important;
    }

    /* Back button - ghost */
    .driver-popover-prev-btn {
      background: ${prevBg} !important;
      color: ${prevColor} !important;
    }
    .driver-popover-prev-btn:hover {
      background: ${prevHoverBg} !important;
      color: ${prevHoverColor} !important;
    }

    /* Next / Done button - brand primary */
    .driver-popover-next-btn {
      background: rgb(var(--color-primary)) !important;
      color: #ffffff !important;
    }
    .driver-popover-next-btn:hover {
      background: color-mix(in srgb, rgb(var(--color-primary)) 85%, black) !important;
    }

    /* Close X */
    .driver-popover-close-btn {
      background: transparent !important;
      color: ${closeBtnColor} !important;
      padding: 4px 8px !important;
      font-size: 16px !important;
    }
    .driver-popover-close-btn:hover {
      color: ${closeBtnHoverColor} !important;
    }

    /* Highlighted element outline */
    .driver-active-element,
    .driver-highlighted-element {
      outline: 2px solid rgb(var(--color-primary)) !important;
      outline-offset: 3px !important;
      border-radius: 8px !important;
    }
  `;
  document.head.appendChild(style);
}

export async function startTour() {
  const [{ driver }, { useUiStore }] = await Promise.all([
    import('driver.js'),
    import('../stores/ui'),
  ]);
  await import('driver.js/dist/driver.css');
  injectTourStyles();

  const uiStore = useUiStore();
  const driverObj = driver({
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Done ✓',
    overlayOpacity: 0.65,
    onDestroyed: () => {
      uiStore.setActiveTab('api-docs');
    },
    steps: [
      {
        element: '[data-tour="sidebar-api-docs"]',
        popover: {
          title: 'API Docs',
          description:
            'Browse the full exam API reference - endpoints, request/response formats, authentication headers, and example payloads. Start here to understand what the exam API can do.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="sidebar-api-client"]',
        popover: {
          title: 'API Client',
          description:
            'Make live API calls directly from the browser - no Postman needed. Fill in parameters, hit Send, and inspect the response. Perfect for exploring the API before writing code.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="sidebar-code-editor"]',
        popover: {
          title: 'Code Editor',
          description:
            'Your main workspace. Pick a problem from the left sidebar, write your solution, then use Run and Submit from the top bar. Supports Python, C++, Java, C, and JavaScript.',
          side: 'right',
          align: 'start',
          onNextClick: () => {
            uiStore.setActiveTab('code-editor');
            setTimeout(() => driverObj.moveNext(), 150);
          },
        },
      },
      {
        element: '[data-tour="run-submit-area"]',
        popover: {
          title: 'Run & Submit',
          description:
            '<b>Run</b> executes your code against the visible sample test cases - use this to verify your output quickly without affecting your score.<br><br><b>Submit</b> runs against all hidden test cases and records your score. Wrong submissions carry a penalty, so test thoroughly before submitting. Once a problem is accepted, no further submissions are allowed.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="btn-clipboard"]',
        popover: {
          title: 'Clipboard History',
          description:
            'Every piece of text you copy during the exam is saved here. Click an entry to copy it again. Use the lock icon to pin an entry so it survives page refreshes.',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-tour="btn-help"]',
        popover: {
          title: 'Help',
          description:
            'Opens this workspace guide whenever you need a refresher. You can restart this tour at any time from the Help menu.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  });

  driverObj.drive();
}
