
declare namespace JSX {
    interface IntrinsicElements {
        'animated-icons': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
            src: string;
            trigger: string;
            'icon-attributes': string;
            height: string;
            width: string;
        };
    }
}
