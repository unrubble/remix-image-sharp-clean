import sharp from "sharp";

export type Color = [number, number, number, number];

enum MimeType {
  SVG = "image/svg+xml",
  JPEG = "image/jpeg",
  PNG = "image/png",
  GIF = "image/gif",
  WEBP = "image/webp",
  BMP = "image/bmp",
  TIFF = "image/tiff",
  AVIF = "image/avif",
}

export type ImageFit =
  /** Preserving aspect ratio, contain image within both provided dimensions using a border where necessary. */
  | "contain"
  /** Preserving aspect ratio, ensure the image covers both provided dimensions by cropping it to fit. */
  | "cover"
  /** Ignore the aspect ratio of the input and stretch to both provided dimensions. */
  | "fill"
  /** Preserving aspect ratio, resize the image to be as large as possible while ensuring its dimensions are less than or equal to both those specified. */
  | "inside"
  /** Preserving aspect ratio, resize the image to be as small as possible while ensuring its dimensions are greater than or equal to both those specified. */
  | "outside";

export type ImagePositionHorizontal = "left" | "center" | "right";
export type ImagePositionVertical = "top" | "center" | "bottom";
export type ImagePosition =
  | ImagePositionHorizontal
  | ImagePositionVertical
  | `${ImagePositionHorizontal} ${ImagePositionVertical}`;

export type FlipDirection = "horizontal" | "vertical" | "both";

export interface CropOptions {
  /** The x position of the upper left pixel. */
  x: number;
  /** The y position of the upper left pixel. */
  y: number;
  /** The number of pixels wide to crop the image. */
  width: number;
  /** The number of pixels high to crop the image. */
  height: number;
}

export interface TransformOptions {
  /** Width of resulting image. (optional, default null) */
  width?: number | null;
  /** Height of resulting image. If width is present, this takes priority. (optional, default null) */
  height?: number | null;
  /** The content type of the resulting image. (optional, default source type) */
  contentType?: MimeType;
  /** How the image should be resized to fit both provided dimensions. (optional, default 'contain') */
  fit?: ImageFit;
  /** Position to use when fit is cover or contain. (optional, default 'center') */
  position?: ImagePosition | string | number;
  /** Background color of resulting image. (optional, default [0x00, 0x00, 0x00, 0x00]) */
  background?: Color;
  /** Quality, integer 1-100. (optional, default 80) */
  quality?: number;
  /** zlib compression level, 0-9. (optional, default 9) */
  compressionLevel?: number;
  /** Number of animation iterations, use 0 for infinite animation. (optional, default 0) */
  loop?: number;
  /** Delay between animation frames (in milliseconds). (optional, default 100) */
  delay?: number;
  /** The number of pixels to blur the image by. (optional, default null) */
  blurRadius?: number | null;
  /** The number of degrees to rotate the image by. (optional, default null) */
  rotate?: number | null;
  /** The direction to mirror the image by. (optional, default null) */
  flip?: FlipDirection | null;
  /** The location to crop the source image before any other operations are applied. (optional, default null) */
  crop?: CropOptions | null;
}

export type SizelessOptions = Omit<TransformOptions, "width" | "height">;

export type Transformer = {
  name: string;
  supportedInputs: Set<MimeType>;
  supportedOutputs: Set<MimeType>;
  fallbackOutput: MimeType;
  transform: (
    input: {
      url: string;
      data: Uint8Array;
      contentType: MimeType;
    },
    output: Required<TransformOptions>
  ) => Promise<Uint8Array>;
};



export const supportedInputs = new Set([
  MimeType.JPEG,
  MimeType.PNG,
  MimeType.GIF,
  MimeType.WEBP,
  MimeType.TIFF,
  MimeType.AVIF,
]);

export const supportedOutputs = new Set([
  MimeType.JPEG,
  MimeType.PNG,
  MimeType.GIF,
  MimeType.WEBP,
  MimeType.TIFF,
  MimeType.AVIF,
]);

export const sharpTransformer: Transformer = {
  name: "sharpTransformer",
  supportedInputs,
  supportedOutputs,
  fallbackOutput: MimeType.PNG,
  transform: async (
    { data },
    {
      contentType: outputContentType,
      width,
      height,
      fit,
      position,
      background,
      quality,
      compressionLevel,
      loop,
      delay,
      blurRadius,
      rotate,
      flip,
      crop,
    }
  ) => {
    const fixedBackground = {
      r: background[0],
      g: background[1],
      b: background[2],
      alpha: background[3],
    };

    const image = sharp(data, {
      animated: true,
    });

    image.ensureAlpha(1);

    if (crop) {
      image.extract({
        left: crop.x,
        top: crop.y,
        width: crop.width,
        height: crop.height,
      });
    }

    if (width != null || height != null) {
      image.resize(width, height, {
        fit,
        position,
        background: fixedBackground,
      });
    }

    if (flip) {
      if (flip === "horizontal" || flip === "both") {
        image.flop();
      }
      if (flip === "vertical" || flip === "both") {
        image.flip();
      }
    }

    if (rotate && rotate != 0) {
      image.rotate(rotate, {
        background: fixedBackground,
      });
    }

    if (blurRadius && blurRadius > 0) {
      image.blur(blurRadius);
    }

    const result = await image
      .jpeg({
        quality,
        progressive: true,
        force: outputContentType === MimeType.JPEG,
      })
      .png({
        progressive: true,
        compressionLevel,
        force: outputContentType === MimeType.PNG,
      })
      .gif({
        loop,
        delay,
        force: outputContentType === MimeType.GIF,
      })
      .webp({
        quality,
        force: outputContentType === MimeType.WEBP,
      })
      .tiff({
        quality,
        force: outputContentType === MimeType.TIFF,
      })
      .avif({
        quality,
        force: outputContentType === MimeType.AVIF,
      })
      .toBuffer();

    return new Uint8Array(result);
  },
};
