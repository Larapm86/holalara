/** Matches `--page-main-panel-reveal-duration` (1.05s) + buffer — see `app.css` `.page-main--media-exit` */
export const HOME_MEDIA_EXIT_MS = 1070;

/**
 * After panels finish sliding down, hold on that frame before swapping routes / starting the view
 * transition so the reverse reveal reads clearly before the destination loads in.
 */
export const HOME_POST_EXIT_PAUSE_MS = 380;
