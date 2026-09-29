import sanitizeHtml from "sanitize-html";

// Source HTML is retained verbatim in storage. This policy applies only to rendering.
export function renderHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img",
      "h1",
      "h2",
      "span",
      "sub",
      "sup",
      "del",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      "*": ["style"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https", "http"] },
    allowProtocolRelative: false,
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\([\d\s,.%]+\)$/i, /^[a-z]+$/i],
        "background-color": [
          /^#[0-9a-f]{3,8}$/i,
          /^rgb\([\d\s,.%]+\)$/i,
          /^[a-z]+$/i,
        ],
        "text-align": [/^(left|right|center|justify)$/],
        "font-weight": [/^(bold|normal|[1-9]00)$/],
        "font-style": [/^(italic|normal)$/],
        "text-decoration": [/^(underline|line-through|none)$/],
        "font-size": [/^\d{1,2}(px|pt)$/],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });
}

export function plainText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(
    /&nbsp;/g,
    " ",
  );
}

export function richWarnings(html: string): string[] {
  const codes: string[] = [];
  if (
    /<(?:script|iframe|object|embed|video|audio|form|input|svg)\b/i.test(html)
  )
    codes.push("EMBED_NOT_RENDERED");
  if (/\bon\w+\s*=|javascript\s*:|data\s*:/i.test(html))
    codes.push("UNSAFE_CONTENT");
  if (/<img\b/i.test(html)) codes.push("REMOTE_IMAGE");
  if (/\bstyle\s*=/i.test(html)) codes.push("STYLE_FILTERED");
  return codes;
}
