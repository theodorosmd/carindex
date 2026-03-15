// Read token directly from localStorage to avoid circular import with main.js
function getAuthToken() {
  return localStorage.getItem('carindex_token')
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function apiFetch(path, options = {}) {
  const token = getAuthToken()
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
}

// ─── state ────────────────────────────────────────────────────────────────────

let state = {
  posts: [],
  loading: false,
  error: null,
  editingPost: null,   // null = list view, {} = new post, {...post} = edit
  saving: false,
  saveError: null,
}

// ─── render ───────────────────────────────────────────────────────────────────

export function renderBlogAdmin() {
  const app = document.getElementById('app')
  if (!app) return

  app.innerHTML = buildShell()
  attachHandlers()
  loadPosts()
}

function buildShell() {
  return `
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <nav class="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <a href="#/" class="flex items-center space-x-2">
              <div class="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-lg">C</span>
              </div>
              <span class="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Carindex</span>
            </a>
            <span class="text-gray-300">/</span>
            <span class="text-sm font-semibold text-gray-700">Blog Admin</span>
          </div>
          <div class="flex items-center gap-3">
            <a href="#/admin" class="text-sm text-gray-600 hover:text-blue-600 transition">← Dashboard</a>
            <span class="px-2.5 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">ADMIN</span>
          </div>
        </div>
      </nav>
    </header>

    <!-- Content -->
    <div class="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
      <div id="blog-admin-content">
        <div class="text-center py-16 text-gray-500">
          <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
          <p>Chargement...</p>
        </div>
      </div>
    </div>
  </div>
  `
}

function renderListView() {
  const { posts, loading, error } = state

  return `
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gestion du Blog</h1>
        <p class="text-sm text-gray-500 mt-1">${posts.length} article${posts.length !== 1 ? 's' : ''} au total</p>
      </div>
      <button id="btn-new-post" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Nouvel article
      </button>
    </div>

    ${error ? `<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">${error}</div>` : ''}

    ${loading ? `
    <div class="text-center py-12 text-gray-500">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2">Chargement...</p>
    </div>
    ` : posts.length === 0 ? `
    <div class="bg-white rounded-xl border border-gray-200 p-16 text-center">
      <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      <p class="text-gray-500 mb-2">Aucun article pour le moment</p>
      <p class="text-sm text-gray-400">Cliquez sur "Nouvel article" pour commencer.</p>
    </div>
    ` : `
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Titre</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
            <th class="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
            <th class="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Auteur</th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          ${posts.map(p => `
          <tr class="hover:bg-gray-50 transition" data-post-id="${p.id}">
            <td class="px-5 py-4">
              <div class="max-w-xs">
                <p class="text-sm font-medium text-gray-900 truncate">${p.title}</p>
                <p class="text-xs text-gray-400 font-mono mt-0.5 truncate">/blog/${p.slug}</p>
              </div>
            </td>
            <td class="px-4 py-4">
              ${p.status === 'published'
                ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Publié
                   </span>`
                : `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>Brouillon
                   </span>`}
            </td>
            <td class="hidden sm:table-cell px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
              ${formatDate(p.published_at || p.created_at)}
            </td>
            <td class="hidden md:table-cell px-4 py-4 text-sm text-gray-500">
              ${p.author || 'Carindex'}
            </td>
            <td class="px-4 py-4">
              <div class="flex items-center justify-end gap-2">
                ${p.status !== 'published' ? `
                <button class="btn-publish text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition" data-id="${p.id}">
                  Publier
                </button>` : `
                <a href="/blog/${p.slug}" target="_blank" rel="noopener" class="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 font-medium transition">
                  Voir ↗
                </a>`}
                <button class="btn-edit text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition" data-id="${p.id}">
                  Modifier
                </button>
                <button class="btn-delete text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium transition" data-id="${p.id}">
                  Supprimer
                </button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    `}
  </div>
  `
}

function renderFormPanel(post = null) {
  const isNew = !post || !post.id
  const p = post || {}
  const tagsStr = Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || '')

  return `
  <div>
    <!-- Back + title -->
    <div class="flex items-center gap-3 mb-6">
      <button id="btn-cancel" class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        Retour
      </button>
      <span class="text-gray-300">/</span>
      <h1 class="text-xl font-bold text-gray-900">${isNew ? 'Nouvel article' : 'Modifier l\'article'}</h1>
    </div>

    ${state.saveError ? `<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">${state.saveError}</div>` : ''}

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main fields -->
      <div class="lg:col-span-2 space-y-5">
        <div class="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Titre <span class="text-red-500">*</span></label>
            <input id="field-title" type="text" value="${escHtml(p.title || '')}"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Titre de l'article">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Slug (URL) <span class="text-red-500">*</span></label>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400 shrink-0">/blog/</span>
              <input id="field-slug" type="text" value="${escHtml(p.slug || '')}"
                class="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="url-de-l-article">
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Extrait</label>
            <textarea id="field-excerpt" rows="3"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Résumé court affiché dans la liste et les meta descriptions">${escHtml(p.excerpt || '')}</textarea>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Contenu HTML <span class="text-red-500">*</span></label>
            <textarea id="field-content" rows="18"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="<p>Votre contenu HTML ici…</p>">${escHtml(p.content || '')}</textarea>
            <p class="text-xs text-gray-400 mt-1">Le contenu est rendu directement en HTML. Assurez-vous qu'il est correctement nettoyé.</p>
          </div>
        </div>
      </div>

      <!-- Sidebar fields -->
      <div class="space-y-5">
        <!-- Publish actions -->
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h3 class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4">Publication</h3>
          <div class="space-y-2">
            <button id="btn-save-draft" class="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition" ${state.saving ? 'disabled' : ''}>
              ${state.saving ? 'Sauvegarde…' : 'Enregistrer comme brouillon'}
            </button>
            <button id="btn-save-publish" class="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition" ${state.saving ? 'disabled' : ''}>
              ${state.saving ? 'Publication…' : 'Publier'}
            </button>
          </div>
        </div>

        <!-- Meta -->
        <div class="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Détails</h3>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Auteur</label>
            <input id="field-author" type="text" value="${escHtml(p.author || 'Carindex')}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Image de couverture (URL)</label>
            <input id="field-cover" type="url" value="${escHtml(p.cover_image || '')}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://…">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Tags (séparés par des virgules)</label>
            <input id="field-tags" type="text" value="${escHtml(tagsStr)}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="achat, prix, europe">
          </div>
        </div>

        <!-- SEO -->
        <div class="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 class="text-xs font-semibold text-gray-600 uppercase tracking-wide">SEO</h3>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Meta Title</label>
            <input id="field-meta-title" type="text" value="${escHtml(p.meta_title || '')}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Titre SEO (optionnel)">
            <p class="text-xs text-gray-400 mt-1">Laissez vide pour utiliser le titre de l'article.</p>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Meta Description</label>
            <textarea id="field-meta-desc" rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Description SEO (optionnel)">${escHtml(p.meta_description || '')}</textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
  `
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getFormData() {
  const title = document.getElementById('field-title')?.value.trim() || ''
  const slug = document.getElementById('field-slug')?.value.trim() || ''
  const excerpt = document.getElementById('field-excerpt')?.value.trim() || ''
  const content = document.getElementById('field-content')?.value || ''
  const author = document.getElementById('field-author')?.value.trim() || 'Carindex'
  const cover_image = document.getElementById('field-cover')?.value.trim() || null
  const tagsRaw = document.getElementById('field-tags')?.value.trim() || ''
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []
  const meta_title = document.getElementById('field-meta-title')?.value.trim() || null
  const meta_description = document.getElementById('field-meta-desc')?.value.trim() || null

  return { title, slug, excerpt, content, author, cover_image, tags, meta_title, meta_description }
}

function rerender() {
  const container = document.getElementById('blog-admin-content')
  if (!container) return
  if (state.editingPost !== null) {
    container.innerHTML = renderFormPanel(state.editingPost === 'new' ? null : state.editingPost)
    attachFormHandlers()
  } else {
    container.innerHTML = renderListView()
    attachListHandlers()
  }
}

// ─── data loading ─────────────────────────────────────────────────────────────

async function loadPosts() {
  state.loading = true
  state.error = null
  rerender()

  try {
    const res = await apiFetch('/api/v1/blog/posts')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    state.posts = data.posts || []
  } catch (err) {
    state.error = `Erreur de chargement : ${err.message}`
  } finally {
    state.loading = false
    rerender()
  }
}

// ─── event handlers ───────────────────────────────────────────────────────────

function attachHandlers() {
  // initial render goes through rerender()
  state.editingPost = null
  rerender()
}

function attachListHandlers() {
  document.getElementById('btn-new-post')?.addEventListener('click', () => {
    state.editingPost = 'new'
    state.saveError = null
    rerender()
  })

  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id
      const post = state.posts.find(p => p.id === id)
      if (post) {
        state.editingPost = { ...post }
        state.saveError = null
        rerender()
      }
    })
  })

  document.querySelectorAll('.btn-publish').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id
      if (!confirm('Publier cet article ?')) return
      await publishPost(id)
    })
  })

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id
      const post = state.posts.find(p => p.id === id)
      if (!confirm(`Supprimer "${post?.title}" ? Cette action est irréversible.`)) return
      await deletePost(id)
    })
  })
}

function attachFormHandlers() {
  // Auto-generate slug from title (only for new posts)
  const isNew = !state.editingPost || state.editingPost === 'new' || !state.editingPost.id
  const titleField = document.getElementById('field-title')
  const slugField = document.getElementById('field-slug')

  if (isNew && titleField && slugField) {
    titleField.addEventListener('input', () => {
      slugField.value = slugify(titleField.value)
    })
  }

  document.getElementById('btn-cancel')?.addEventListener('click', () => {
    state.editingPost = null
    state.saveError = null
    rerender()
  })

  document.getElementById('btn-save-draft')?.addEventListener('click', () => savePost('draft'))
  document.getElementById('btn-save-publish')?.addEventListener('click', () => savePost('published'))
}

// ─── API actions ──────────────────────────────────────────────────────────────

async function savePost(status) {
  const formData = getFormData()

  if (!formData.title) {
    state.saveError = 'Le titre est requis.'
    rerender()
    return
  }
  if (!formData.slug) {
    state.saveError = 'Le slug est requis.'
    rerender()
    return
  }

  state.saving = true
  state.saveError = null
  rerender()

  const postId = state.editingPost && state.editingPost !== 'new' ? state.editingPost.id : null
  const body = { ...formData, status }

  try {
    let res
    if (postId) {
      res = await apiFetch(`/api/v1/blog/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    } else {
      res = await apiFetch('/api/v1/blog/posts', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || `HTTP ${res.status}`)
    }

    // Success — reload list and go back
    state.saving = false
    state.editingPost = null
    state.saveError = null
    await loadPosts()
  } catch (err) {
    state.saving = false
    state.saveError = `Erreur : ${err.message}`
    rerender()
  }
}

async function publishPost(id) {
  try {
    const res = await apiFetch(`/api/v1/blog/posts/${id}/publish`, { method: 'POST' })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || `HTTP ${res.status}`)
    }
    await loadPosts()
  } catch (err) {
    state.error = `Erreur de publication : ${err.message}`
    rerender()
  }
}

async function deletePost(id) {
  try {
    const res = await apiFetch(`/api/v1/blog/posts/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || `HTTP ${res.status}`)
    }
    state.posts = state.posts.filter(p => p.id !== id)
    rerender()
  } catch (err) {
    state.error = `Erreur de suppression : ${err.message}`
    rerender()
  }
}
