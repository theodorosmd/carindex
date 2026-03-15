import { tr, renderLanguageToggle, attachLanguageToggle } from '../utils/i18n.js'

export function renderLogin() {
  const app = document.getElementById('app')

  app.innerHTML = `
    <div class="min-h-screen flex">

      <!-- ── Left brand panel ── -->
      <div class="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-zinc-950 flex-col justify-between p-12 relative overflow-hidden">

        <!-- Background dot pattern -->
        <div class="absolute inset-0 opacity-[0.03]" style="background-image:radial-gradient(circle at 1px 1px,white 1px,transparent 0);background-size:32px 32px;"></div>

        <!-- Top: logo -->
        <a href="#/" class="relative flex items-center gap-3">
          <div class="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <span class="text-zinc-900 font-bold text-base">C</span>
          </div>
          <span class="text-white font-semibold text-lg tracking-tight">Carindex</span>
        </a>

        <!-- Middle: headline + stats -->
        <div class="relative">
          <p class="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-4">${tr('Automotive intelligence', 'Intelligence automobile')}</p>
          <h1 class="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            ${tr('The market,<br>in real time.', 'Le marché,<br>en temps réel.')}
          </h1>
          <p class="text-zinc-400 text-sm leading-relaxed mb-10 max-w-xs">
            ${tr('Track prices, spot deals, and make smarter buying decisions across 13 European markets.', 'Suivez les prix, repérez les bonnes affaires et prenez de meilleures décisions sur 13 marchés européens.')}
          </p>
          <div class="grid grid-cols-3 gap-6">
            <div>
              <p class="text-2xl font-bold text-white">650k+</p>
              <p class="text-xs text-zinc-500 mt-0.5">${tr('active listings', 'annonces actives')}</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-white">13</p>
              <p class="text-xs text-zinc-500 mt-0.5">${tr('countries', 'pays')}</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-white">${tr('Daily', 'Quotidien')}</p>
              <p class="text-xs text-zinc-500 mt-0.5">${tr('updates', 'mises à jour')}</p>
            </div>
          </div>
        </div>

        <!-- Bottom: testimonial -->
        <div class="relative border-t border-zinc-800 pt-8">
          <p class="text-zinc-400 text-sm italic leading-relaxed">
            "${tr('Carindex helped us cut sourcing time by half. The market price tool is indispensable.', 'Carindex nous a permis de réduire notre temps de sourcing de moitié. L\'outil de prix marché est indispensable.')}"
          </p>
          <p class="text-zinc-500 text-xs mt-3">${tr('— Professional dealer, France', '— Concessionnaire professionnel, France')}</p>
        </div>
      </div>

      <!-- ── Right form panel ── -->
      <div class="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-white">

        <!-- Mobile logo -->
        <div class="lg:hidden mb-10 text-center">
          <a href="#/" class="inline-flex items-center gap-2.5">
            <div class="w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-base">C</span>
            </div>
            <span class="text-zinc-900 font-semibold text-lg">Carindex</span>
          </a>
        </div>

        <div class="w-full max-w-sm">

          <!-- Language toggle -->
          <div class="flex justify-end mb-6">
            ${renderLanguageToggle()}
          </div>

          <!-- Header -->
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-zinc-900">${tr('Welcome back', 'Bon retour')}</h2>
            <p class="text-zinc-500 text-sm mt-1">${tr('Sign in to your account', 'Connectez-vous à votre compte')}</p>
          </div>

          <!-- Form -->
          <form id="login-form" class="space-y-5">
            <div>
              <label for="email" class="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
              <input
                type="email" id="email" name="email" required autocomplete="email"
                class="w-full px-4 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition"
                placeholder="${tr('you@email.com', 'votre@email.com')}"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="password" class="block text-sm font-medium text-zinc-700">${tr('Password', 'Mot de passe')}</label>
                <a href="#" class="text-xs text-zinc-500 hover:text-zinc-900 transition">${tr('Forgot password?', 'Mot de passe oublié ?')}</a>
              </div>
              <div class="relative">
                <input
                  type="password" id="password" name="password" required autocomplete="current-password"
                  class="w-full px-4 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition pr-11"
                  placeholder="••••••••"
                />
                <button type="button" id="toggle-password" class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition">
                  <svg id="eye-show" class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  <svg id="eye-hide" class="w-4.5 h-4.5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                </button>
              </div>
            </div>

            <div id="login-error" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              <span id="login-error-text"></span>
            </div>

            <button
              type="submit" id="login-submit"
              class="w-full bg-zinc-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-zinc-700 transition focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 flex items-center justify-center gap-2"
            >
              <span>${tr('Sign in', 'Se connecter')}</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
          </form>

          <p class="text-center text-sm text-zinc-500 mt-6">
            ${tr("Don't have an account?", 'Pas encore de compte ?')}
            <a href="#/signup" class="text-zinc-900 font-semibold hover:underline ml-1">${tr('Sign up free', "S'inscrire gratuitement")}</a>
          </p>

        </div>
      </div>
    </div>
  `

  attachLanguageToggle(() => window.location.reload())

  // Password show/hide
  const toggleBtn = document.getElementById('toggle-password')
  const pwdInput = document.getElementById('password')
  const eyeShow = document.getElementById('eye-show')
  const eyeHide = document.getElementById('eye-hide')
  toggleBtn.addEventListener('click', () => {
    const hidden = pwdInput.type === 'password'
    pwdInput.type = hidden ? 'text' : 'password'
    eyeShow.classList.toggle('hidden', hidden)
    eyeHide.classList.toggle('hidden', !hidden)
  })

  // Form submission
  const form = document.getElementById('login-form')
  const submitBtn = document.getElementById('login-submit')
  const errorDiv = document.getElementById('login-error')
  const errorText = document.getElementById('login-error-text')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    submitBtn.disabled = true
    submitBtn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><span>${tr('Signing in…', 'Connexion…')}</span>`
    errorDiv.classList.add('hidden')

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || tr('Login failed', 'Erreur de connexion'))

      localStorage.setItem('carindex_token', data.token)
      localStorage.setItem('carindex_user', JSON.stringify(data.user))
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '#/dashboard'
      window.location.hash = redirectTo
      window.location.reload()
    } catch (error) {
      errorText.textContent = error.message
      errorDiv.classList.remove('hidden')
      submitBtn.disabled = false
      submitBtn.innerHTML = `<span>${tr('Sign in', 'Se connecter')}</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>`
    }
  })
}
