import { tr, renderLanguageToggle, attachLanguageToggle } from '../utils/i18n.js'

export function renderSignup() {
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

        <!-- Middle -->
        <div class="relative">
          <p class="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-4">${tr('Free forever', 'Gratuit pour toujours')}</p>
          <h1 class="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            ${tr('Start finding<br>great deals today.', 'Commencez à trouver<br>de bonnes affaires.')}
          </h1>
          <p class="text-zinc-400 text-sm leading-relaxed mb-10 max-w-xs">
            ${tr('A free account gives you market prices, deal scores, and price alerts across 13 European countries.', 'Un compte gratuit vous donne accès aux prix du marché, scores de bonne affaire et alertes sur 13 pays européens.')}
          </p>

          <ul class="space-y-5">
            ${[
              [tr('Market price on every listing', 'Prix de marché sur chaque annonce'), tr('See instantly if a car is priced fairly.', 'Voyez instantanément si une voiture est bien prix.')],
              [tr('Deal score (0–100)', 'Score de bonne affaire (0–100)'), tr('Know how good each deal is at a glance.', 'Évaluez chaque affaire d\'un coup d\'œil.')],
              [tr('Price drop alerts', 'Alertes de baisse de prix'), tr('Get notified when prices drop.', 'Soyez notifié quand les prix baissent.')],
              [tr('No credit card required', 'Aucune carte bancaire requise'), tr('Upgrade anytime. Cancel anytime.', 'Passez au plan supérieur à tout moment.')],
            ].map(([title, desc]) => `
              <li class="flex items-start gap-3">
                <div class="mt-0.5 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <svg class="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-zinc-200">${title}</p>
                  <p class="text-xs text-zinc-500 mt-0.5">${desc}</p>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- Bottom: social proof -->
        <div class="relative border-t border-zinc-800 pt-8 flex items-center gap-3">
          <div class="flex -space-x-2">
            ${['#3B82F6','#8B5CF6','#10B981','#F59E0B'].map(c => `<div class="w-7 h-7 rounded-full border-2 border-zinc-900 flex items-center justify-center" style="background:${c}"><svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg></div>`).join('')}
          </div>
          <p class="text-zinc-500 text-xs">${tr('Join thousands of professionals already using Carindex', 'Rejoignez des milliers de professionnels qui utilisent déjà Carindex')}</p>
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
            <h2 class="text-2xl font-bold text-zinc-900">${tr('Create your account', 'Créer votre compte')}</h2>
            <p class="text-zinc-500 text-sm mt-1">${tr('Free forever. No credit card required.', 'Gratuit pour toujours. Sans carte bancaire.')}</p>
          </div>

          <!-- Form -->
          <form id="signup-form" class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-zinc-700 mb-1.5">${tr('Email address', 'Adresse email')}</label>
              <input
                type="email" id="email" name="email" required autocomplete="email"
                class="w-full px-4 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition"
                placeholder="${tr('you@email.com', 'votre@email.com')}"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-zinc-700 mb-1.5">${tr('Password', 'Mot de passe')}</label>
              <div class="relative">
                <input
                  type="password" id="password" name="password" required minlength="8" autocomplete="new-password"
                  class="w-full px-4 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition pr-11"
                  placeholder="••••••••"
                />
                <button type="button" id="toggle-password" class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition">
                  <svg id="eye-show" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  <svg id="eye-hide" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                </button>
              </div>
              <!-- Strength bar -->
              <div class="mt-2 flex gap-1">
                <div class="h-1 flex-1 rounded-full bg-zinc-200" id="bar-1"></div>
                <div class="h-1 flex-1 rounded-full bg-zinc-200" id="bar-2"></div>
                <div class="h-1 flex-1 rounded-full bg-zinc-200" id="bar-3"></div>
                <div class="h-1 flex-1 rounded-full bg-zinc-200" id="bar-4"></div>
              </div>
              <p class="text-xs text-zinc-400 mt-1" id="strength-label">${tr('At least 8 characters', 'Au moins 8 caractères')}</p>
            </div>

            <div>
              <label for="password-confirm" class="block text-sm font-medium text-zinc-700 mb-1.5">${tr('Confirm password', 'Confirmer le mot de passe')}</label>
              <input
                type="password" id="password-confirm" name="password-confirm" required autocomplete="new-password"
                class="w-full px-4 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            <div class="flex items-start gap-2.5 pt-1">
              <input type="checkbox" id="terms" name="terms" required class="mt-0.5 w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900 flex-shrink-0" />
              <label for="terms" class="text-xs text-zinc-500 leading-relaxed">
                ${tr('I accept the', "J'accepte les")}
                <a href="#" class="text-zinc-700 underline">${tr('terms of service', "conditions d'utilisation")}</a>
                ${tr('and the', 'et la')}
                <a href="#" class="text-zinc-700 underline">${tr('privacy policy', 'politique de confidentialité')}</a>.
              </label>
            </div>

            <div id="signup-error" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              <span id="signup-error-text"></span>
            </div>
            <div id="signup-success" class="hidden bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span id="signup-success-text"></span>
            </div>

            <button
              type="submit" id="signup-submit"
              class="w-full bg-zinc-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-zinc-700 transition focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 flex items-center justify-center gap-2"
            >
              <span>${tr('Create my free account', 'Créer mon compte gratuit')}</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
          </form>

          <p class="text-center text-sm text-zinc-500 mt-6">
            ${tr('Already have an account?', 'Déjà un compte ?')}
            <a href="#/login" class="text-zinc-900 font-semibold hover:underline ml-1">${tr('Sign in', 'Se connecter')}</a>
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

  // Password strength meter
  const bars = [1,2,3,4].map(i => document.getElementById(`bar-${i}`))
  const strengthLabel = document.getElementById('strength-label')
  const strengthColors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']
  const strengthLabels = [tr('Weak', 'Faible'), tr('Fair', 'Moyen'), tr('Good', 'Bien'), tr('Strong', 'Fort')]
  pwdInput.addEventListener('input', () => {
    const v = pwdInput.value
    let score = 0
    if (v.length >= 8) score++
    if (/[A-Z]/.test(v)) score++
    if (/[0-9]/.test(v)) score++
    if (/[^A-Za-z0-9]/.test(v)) score++
    bars.forEach((bar, i) => {
      bar.className = `h-1 flex-1 rounded-full ${i < score ? strengthColors[score - 1] : 'bg-zinc-200'}`
    })
    strengthLabel.textContent = score > 0 ? strengthLabels[score - 1] : tr('At least 8 characters', 'Au moins 8 caractères')
  })

  // Form submission
  const form = document.getElementById('signup-form')
  const submitBtn = document.getElementById('signup-submit')
  const errorDiv = document.getElementById('signup-error')
  const errorText = document.getElementById('signup-error-text')
  const successDiv = document.getElementById('signup-success')
  const successText = document.getElementById('signup-success-text')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    const passwordConfirm = document.getElementById('password-confirm').value

    errorDiv.classList.add('hidden')

    if (password !== passwordConfirm) {
      errorText.textContent = tr('Passwords do not match', 'Les mots de passe ne correspondent pas')
      errorDiv.classList.remove('hidden')
      return
    }
    if (password.length < 8) {
      errorText.textContent = tr('Password must be at least 8 characters', 'Le mot de passe doit contenir au moins 8 caractères')
      errorDiv.classList.remove('hidden')
      return
    }

    submitBtn.disabled = true
    submitBtn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><span>${tr('Creating account…', 'Création du compte…')}</span>`

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || tr('Failed to create account', 'Erreur lors de la création du compte'))

      localStorage.setItem('carindex_token', data.token)
      localStorage.setItem('carindex_user', JSON.stringify(data.user))

      successText.textContent = tr('Account created! Redirecting…', 'Compte créé ! Redirection…')
      successDiv.classList.remove('hidden')

      setTimeout(() => {
        window.location.hash = '#/dashboard'
        window.location.reload()
      }, 900)
    } catch (error) {
      errorText.textContent = error.message
      errorDiv.classList.remove('hidden')
      submitBtn.disabled = false
      submitBtn.innerHTML = `<span>${tr('Create my free account', 'Créer mon compte gratuit')}</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>`
    }
  })
}
