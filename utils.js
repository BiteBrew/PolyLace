// utils.js
export async function resolveContent(content) {
    return content instanceof Promise ? await content : content;
  }