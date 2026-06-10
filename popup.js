document.addEventListener('DOMContentLoaded', () => {
  const bookmarkList = document.getElementById('bookmarkList');
  const searchInput = document.getElementById('searchInput');
  const breadcrumb = document.getElementById('breadcrumb');
  const viewTaggedBtn = document.getElementById('viewTaggedBtn');

  let currentFolderId = '0';

  // Initial load
  if (typeof chrome !== 'undefined' && chrome.bookmarks) {
    loadBookmarks('0');
  } else {
    console.warn('chrome.bookmarks API not available. This is expected outside of an extension context.');
    const msg = document.createElement('div');
    msg.className = 'bookmark-item';
    msg.textContent = 'Extension environment not detected. Use "View Tagged Bookmarks" to test UI.';
    bookmarkList.appendChild(msg);
  }

  // Search functionality
  searchInput.addEventListener('input', () => {
    const query = searchInput.value;
    if (query.length > 1 && typeof chrome !== 'undefined' && chrome.bookmarks) {
      chrome.bookmarks.search(query, (results) => {
        renderBookmarks(results);
      });
    } else if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      loadBookmarks(currentFolderId);
    }
  });

  // Navigation via breadcrumb
  breadcrumb.addEventListener('click', (e) => {
    if (e.target.tagName === 'SPAN') {
      const folderId = e.target.getAttribute('data-id');
      if (folderId) {
        loadBookmarks(folderId);
      }
    }
  });

  // View Tagged Bookmarks (from HTML file)
  viewTaggedBtn.addEventListener('click', async () => {
    if (typeof window.parseTaggedBookmarks === 'function') {
      const taggedBookmarks = await window.parseTaggedBookmarks();
      if (taggedBookmarks) {
        renderTaggedBookmarks(taggedBookmarks);
      } else {
        alert('Could not load tagged bookmarks. Make sure data.html exists.');
      }
    } else {
      alert('Parser not loaded yet.');
    }
  });

  function loadBookmarks(folderId) {
    currentFolderId = folderId;
    if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      chrome.bookmarks.getSubTree(folderId, (nodes) => {
        const folder = nodes[0];
        renderBookmarks(folder.children || []);
        updateBreadcrumb(folderId);
      });
    }
  }

  function renderBookmarks(nodes) {
    bookmarkList.innerHTML = '';

    if (nodes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'bookmark-item';
      empty.textContent = 'No bookmarks found.';
      bookmarkList.appendChild(empty);
      return;
    }

    nodes.forEach(node => {
      const item = document.createElement('div');
      item.className = 'bookmark-item';

      const isFolder = !node.url;
      const iconClass = isFolder ? 'folder-icon' : 'link-icon';

      const icon = document.createElement('span');
      icon.className = `icon ${iconClass}`;

      const title = document.createElement('span');
      title.className = 'title';
      title.title = node.title;
      title.textContent = node.title;

      item.appendChild(icon);
      item.appendChild(title);

      item.addEventListener('click', () => {
        if (isFolder) {
          loadBookmarks(node.id);
        } else {
          window.open(node.url, '_blank');
        }
      });

      bookmarkList.appendChild(item);
    });
  }

  function renderTaggedBookmarks(bookmarks) {
    bookmarkList.innerHTML = '';
    breadcrumb.innerHTML = '';

    const rootSpan = document.createElement('span');
    rootSpan.setAttribute('data-id', '0');
    rootSpan.textContent = 'Root';
    breadcrumb.appendChild(rootSpan);
    breadcrumb.appendChild(document.createTextNode(' > '));
    const taggedSpan = document.createElement('span');
    taggedSpan.textContent = 'Tagged Bookmarks';
    breadcrumb.appendChild(taggedSpan);

    bookmarks.forEach(bm => {
      const item = document.createElement('div');
      item.className = 'bookmark-item';
      item.style.flexDirection = 'column';
      item.style.alignItems = 'flex-start';

      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.alignItems = 'center';

      const icon = document.createElement('span');
      icon.className = 'icon link-icon';

      const title = document.createElement('span');
      title.className = 'title';
      title.title = bm.title;
      title.textContent = bm.title || bm.url;

      header.appendChild(icon);
      header.appendChild(title);

      const info = document.createElement('div');
      info.className = 'tagged-info';
      info.textContent = `Category: ${bm.category} | Topic: ${bm.topic} | Group: ${bm.group}`;

      item.appendChild(header);
      item.appendChild(info);

      item.addEventListener('click', () => {
        window.open(bm.url, '_blank');
      });

      bookmarkList.appendChild(item);
    });
  }

  async function updateBreadcrumb(folderId) {
    if (folderId === '0') {
      breadcrumb.innerHTML = '';
      const rootSpan = document.createElement('span');
      rootSpan.setAttribute('data-id', '0');
      rootSpan.textContent = 'Root';
      breadcrumb.appendChild(rootSpan);
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      chrome.bookmarks.get(folderId, async (nodes) => {
        const node = nodes[0];
        const path = await getPath(node);

        breadcrumb.innerHTML = '';
        path.forEach((p, index) => {
          const span = document.createElement('span');
          span.setAttribute('data-id', p.id);
          span.textContent = p.title || 'Root';
          breadcrumb.appendChild(span);
          if (index < path.length - 1) {
            breadcrumb.appendChild(document.createTextNode(' > '));
          }
        });
      });
    }
  }

  async function getPath(node) {
    const path = [];
    let current = node;
    while (current) {
      path.unshift({ id: current.id, title: current.title });
      if (current.parentId && current.id !== '0') {
        current = await new Promise(resolve => chrome.bookmarks.get(current.parentId, (nodes) => resolve(nodes[0])));
      } else {
        current = null;
      }
    }
    return path;
  }
});
