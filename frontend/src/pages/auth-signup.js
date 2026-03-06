import { tr, renderLanguageToggle, attachLanguageToggle } from '../utils/i18n.js'

export function renderSignup() {
  const app = document.getElementById('app')
  
  app.innerHTML = `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div class="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row">
        <!-- Left: Signup Form -->
        <div class="flex-1 p-8 lg:p-10">
          <div class="flex items-center justify-between mb-6">
            <a href="#/" class="inline-flex items-center space-x-2">
              <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-xl">C</span>
              </div>
              <span class="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Carindex</span>
            </a>
            ${renderLanguageToggle()}
          </div>

          <h1 class="text-2xl font-bold text-gray-900 mb-2">${tr('Create an account', 'Créer un compte')}</h1>
          <p class="text-gray-500 text-sm mb-6">${tr('Join thousands of professionals tracking the automotive market', 'Rejoignez des milliers de professionnels du marché automobile')}</p>

          <form id="signup-form" class="space-y-5">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1.5">
                ${tr('Email address', 'Adresse email')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="${tr('you@email.com', 'votre@email.com')}"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-1.5">
                ${tr('Password', 'Mot de passe')}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                minlength="8"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="••••••••"
              />
              <p class="mt-1 text-xs text-gray-500">
                ${tr('At least 8 characters, with uppercase, lowercase, and a number', 'Au moins 8 caractères, avec majuscule, minuscule et chiffre')}
              </p>
            </div>

            <div>
              <label for="password-confirm" class="block text-sm font-medium text-gray-700 mb-1.5">
                ${tr('Confirm password', 'Confirmer le mot de passe')}
              </label>
              <input
                type="password"
                id="password-confirm"
                name="password-confirm"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="••••••••"
              />
            </div>

            <div class="flex items-start">
              <input
                type="checkbox"
                id="terms"
                name="terms"
                required
                class="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label for="terms" class="ml-2 text-sm text-gray-600">
                ${tr('I accept the', "J'accepte les")} 
                <a href="#" class="text-blue-600 hover:text-blue-700">${tr('terms of service', "conditions d'utilisation")}</a>
                ${tr('and the', 'et la')} 
                <a href="#" class="text-blue-600 hover:text-blue-700">${tr('privacy policy', 'politique de confidentialité')}</a>
              </label>
            </div>

            <div id="signup-error" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"></div>
            <div id="signup-success" class="hidden bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm"></div>

            <button
              type="submit"
              id="signup-submit"
              class="w-full bg-blue-600 text-white py-3.5 rounded-lg font-semibold hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
            >
              <span>${tr('Sign up', "S'inscrire")}</span>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
            </button>

            <div class="text-center text-sm text-gray-600">
              ${tr('Already have an account?', 'Déjà un compte ?')} 
              <a href="#/login" class="text-blue-600 hover:text-blue-700 font-medium">
                ${tr('Sign in', 'Se connecter')}
              </a>
            </div>
          </form>
        </div>

        <!-- Right: Why create an account? -->
        <div class="flex-1 bg-amber-50 lg:bg-gradient-to-br lg:from-amber-50 lg:to-amber-100 p-8 lg:p-10 flex flex-col justify-center">
          <h2 class="text-xl font-bold text-gray-900 mb-6">${tr('Why create an account?', 'Pourquoi créer un compte ?')}</h2>
          <ul class="space-y-5">
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center">
                <svg class="w-5 h-5 text-amber-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </span>
              <div>
                <span class="font-medium text-gray-900">${tr('Save and retrieve your favorite listings at any time.', 'Enregistrez et retrouvez vos annonces favorites à tout moment.')}</span>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center">
                <svg class="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              </span>
              <div>
                <span class="font-medium text-gray-900">${tr('Create alerts for new listings matching your criteria.', 'Créez des alertes pour les nouvelles annonces correspondant à vos critères.')}</span>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center">
                <svg class="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              </span>
              <div>
                <span class="font-medium text-gray-900">${tr('Compare market prices and valuations across models.', 'Comparez les prix du marché et les estimations entre modèles.')}</span>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center">
                <svg class="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </span>
              <div>
                <span class="font-medium text-gray-900">${tr('Because it\'s free and fast.', 'Parce que c\'est gratuit et rapide.')}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `

  attachLanguageToggle(() => window.location.reload())

  // Handle form submission
  const form = document.getElementById('signup-form')
  const submitBtn = document.getElementById('signup-submit')
  const errorDiv = document.getElementById('signup-error')
  const successDiv = document.getElementById('signup-success')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    const passwordConfirm = document.getElementById('password-confirm').value

    // Client-side validation
    if (password !== passwordConfirm) {
      errorDiv.textContent = tr('Passwords do not match', 'Les mots de passe ne correspondent pas')
      errorDiv.classList.remove('hidden')
      return
    }

    if (password.length < 8) {
      errorDiv.textContent = tr('Password must be at least 8 characters', 'Le mot de passe doit contenir au moins 8 caractères')
      errorDiv.classList.remove('hidden')
      return
    }

    // Disable submit button
    submitBtn.disabled = true
    submitBtn.textContent = tr('Creating account...', 'Création du compte...')
    errorDiv.classList.add('hidden')
    successDiv.classList.add('hidden')

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || tr('Failed to create account', 'Erreur lors de la création du compte'))
      }

      // Store token and user info
      localStorage.setItem('carindex_token', data.token)
      localStorage.setItem('carindex_user', JSON.stringify(data.user))

      // Show success message
      successDiv.textContent = tr('Account created! Redirecting...', 'Compte créé avec succès ! Redirection...')
      successDiv.classList.remove('hidden')

      // Auto-login and redirect
      setTimeout(() => {
        window.location.hash = '#/dashboard'
        window.location.reload()
      }, 1000)
    } catch (error) {
      errorDiv.textContent = error.message
      errorDiv.classList.remove('hidden')
      submitBtn.disabled = false
      submitBtn.textContent = tr('Create my account', 'Créer mon compte')
    }
  })
}







