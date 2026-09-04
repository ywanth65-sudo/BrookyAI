function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(value) {
    let html = escapeHtml(value);
    const inlineCode = [];

    html = html.replace(/`([^`]+)`/g, (_, code) => {
        inlineCode.push(`<code>${code}</code>`);
        return `\u0000inline-code-${inlineCode.length - 1}\u0000`;
    });
    html = html.replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, boldA, boldB) => `<strong>${boldA || boldB}</strong>`);
    html = html.replace(/\*([^*\n]+)\*|_([^_\n]+)_/g, (_, italicA, italicB) => `<em>${italicA || italicB}</em>`);
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    return html.replace(/\u0000inline-code-(\d+)\u0000/g, (_, index) => inlineCode[index]);
}

function renderMarkdown(markdown) {
    const codeBlocks = [];
    const source = markdown.replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (_, language, code) => {
        const className = language ? ` class="language-${escapeHtml(language)}"` : "";
        codeBlocks.push(`<pre><code${className}>${escapeHtml(code.replace(/\n$/, ""))}</code></pre>`);
        return `\u0000code-block-${codeBlocks.length - 1}\u0000`;
    });
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let listType = null;

    const closeList = () => {
        if (listType) {
            html.push(`</${listType}>`);
            listType = null;
        }
    };

    const closeParagraph = () => {
        if (paragraph.length) {
            html.push(`<p>${paragraph.map(renderInlineMarkdown).join("<br>")}</p>`);
            paragraph = [];
        }
    };

    lines.forEach((line) => {
        const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
        const unorderedItem = line.match(/^\s*[-*+]\s+(.+)$/);
        const orderedItem = line.match(/^\s*\d+[.)]\s+(.+)$/);
        const quote = line.match(/^\s*>\s?(.*)$/);

        if (!line.trim()) {
            closeParagraph();
            closeList();
        } else if (heading) {
            closeParagraph();
            closeList();
            const level = heading[1].length;
            html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
        } else if (unorderedItem || orderedItem) {
            closeParagraph();
            const nextType = unorderedItem ? "ul" : "ol";
            if (listType !== nextType) {
                closeList();
                listType = nextType;
                html.push(`<${listType}>`);
            }
            html.push(`<li>${renderInlineMarkdown((unorderedItem || orderedItem)[1])}</li>`);
        } else if (quote) {
            closeParagraph();
            closeList();
            html.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
        } else if (/^\u0000(code-block|inline-code)-\d+\u0000$/.test(line.trim())) {
            closeParagraph();
            closeList();
            html.push(line.trim());
        } else {
            closeList();
            paragraph.push(line);
        }
    });

    closeParagraph();
    closeList();

    return html.join("\n").replace(/\u0000code-block-(\d+)\u0000/g, (_, index) => codeBlocks[index]);
}
