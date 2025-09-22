
declare module 'html-pdf' {
    import { Stream } from 'stream';

    interface Options {
        format?: 'A3' | 'A4' | 'A5' | 'Legal' | 'Letter' | 'Tabloid';
        orientation?: 'portrait' | 'landscape';
        border?: string | {
            top?: string;
            right?: string;
            bottom?: string;
            left?: string;
        };
        header?: {
            height?: string;
            contents?: string;
        };
        footer?: {
            height?: string;
            contents?: {
                first?: string;
                default?: string;
                last?: string;
            };
        };
        type?: 'png' | 'jpeg' | 'pdf';
        quality?: string;
        base?: string;
        httpHeaders?: Record<string, string>;
        timeout?: number;
    }

    interface CreateResult {
        toBuffer(callback: (err: Error, buffer: Buffer) => void): void;
        toFile(filename: string, callback: (err: Error, res: { filename: string }) => void): void;
        toStream(callback: (err: Error, stream: Stream) => void): void;
    }

    function create(html: string, options?: Options): CreateResult;

    export { create, Options, CreateResult };
}
