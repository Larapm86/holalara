/** One frame of grayscale TV static — shared by TvStaticBackground */

let cachedW = 0;
let cachedH = 0;
let imageData: ImageData | null = null;
let u32: Uint32Array | null = null;

export function renderTvNoiseFrame(ctx: CanvasRenderingContext2D, w: number, h: number): void {
	if (w !== cachedW || h !== cachedH || !imageData || !u32) {
		cachedW = w;
		cachedH = h;
		imageData = ctx.createImageData(w, h);
		u32 = new Uint32Array(
			imageData.data.buffer,
			imageData.data.byteOffset,
			imageData.data.length / 4
		);
	}
	const len = w * h;
	for (let i = 0; i < len; i++) {
		const v = (Math.random() * 256) | 0;
		u32[i] = 0xff000000 | (v * 0x010101);
	}
	ctx.putImageData(imageData, 0, 0);
}
