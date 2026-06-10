/**
 * parser.js
 * Utility to parse the tagged bookmarks from data.html
 */

window.parseTaggedBookmarks = async function() {
  try {
    const response = await fetch('data.html');
    if (!response.ok) {
      throw new Error(`Failed to fetch data.html: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const links = doc.querySelectorAll('a');

    const bookmarks = Array.from(links).map(link => {
      return {
        url: link.getAttribute('href'),
        title: link.textContent.trim(),
        domain: link.getAttribute('domain'),
        topic: link.getAttribute('topic'),
        category: link.getAttribute('category'),
        group: link.getAttribute('group'),
        usedFor: link.getAttribute('used_for')
      };
    });

    return bookmarks;
  } catch (error) {
    console.error('Error parsing tagged bookmarks:', error);
    return null;
  }
};
