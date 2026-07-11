declare module "docxtemplater-image-module-free" {
  type ImageModuleOptions = {
    centered?: boolean;
    fileType?: string;
    getImage: (tagValue: string, tagName?: string) => Buffer | Promise<Buffer>;
    getSize: (
      img: Buffer,
      tagValue?: string,
      tagName?: string
    ) => [number, number] | Promise<[number, number]>;
  };

  export default class ImageModule {
    constructor(options: ImageModuleOptions);
  }
}
