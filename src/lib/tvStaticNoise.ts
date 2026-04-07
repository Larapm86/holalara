/** One frame of grayscale TV static — shared by TvStaticBackground */
export function renderTvNoiseFrame(ctx: CanvasRenderingContext2D, w: number, h: number): void {
	const imageData = ctx.createImageData(w, h);
	const d = imageData.data;
	for (let i = 0; i < d.length; i += 4) {
		const v = (Math.random() * 256) | 0;
		d[i] = v;
		d[i + 1] = v;
		d[i + 2] = v;
		d[i + 3] = 255;
	}
	ctx.putImageData(imageData, 0, 0);
}
