import { tr, renderLanguageToggle, attachLanguageToggle } from '../utils/i18n.js'

export function renderSignup() {
  const app = document.getElementById('app')
  
  app.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div class="max-w-md w-full">
        <!-- Logo -->
        <div class="text-center mb-8">
          <a href="#/" class="inline-flex items-center space-x-2">
            <div class="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-2xl">C</span>
            </div>
            <span class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Carindex</span>
          </a>
          <p class="mt-2 text-gray-600">${tr('Create your account for free', 'Créez votre compte gratuitement')}</p>
          <div class="mt-4 flex justify-center">
            ${renderLanguageToggle()}
          </div>
        </div>

        <!-- Signup Form -->
        <div class="bg-white rounded-xl shadow-lg p-8">
          <form id="signup-form" class="space-y-6">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                Email
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
              <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
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
              <label for="password-confirm" class="block text-sm font-medium text-gray-700 mb-2">
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
              class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              ${tr('Create my account', 'Créer mon compte')}
            </button>

            <div class="text-center text-sm text-gray-600">
              ${tr('Already have an account?', 'Déjà un compte ?')} 
              <a href="#/login" class="text-blue-600 hover:text-blue-700 font-medium">
                ${tr('Sign in', 'Se connecter')}
              </a>
            </div>
          </form>
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







