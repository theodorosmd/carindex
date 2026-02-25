import { tr, renderLanguageToggle, attachLanguageToggle } from '../utils/i18n.js'

export function renderLogin() {
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
          <p class="mt-2 text-gray-600">${tr('Sign in to your account', 'Connectez-vous à votre compte')}</p>
          <div class="mt-4 flex justify-center">
            ${renderLanguageToggle()}
          </div>
        </div>

        <!-- Login Form -->
        <div class="bg-white rounded-xl shadow-lg p-8">
          <form id="login-form" class="space-y-6">
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
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="••••••••"
              />
            </div>

            <div class="flex items-center justify-between">
              <label class="flex items-center">
                <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                <span class="ml-2 text-sm text-gray-600">${tr('Remember me', 'Se souvenir de moi')}</span>
              </label>
              <a href="#" class="text-sm text-blue-600 hover:text-blue-700">
                ${tr('Forgot password?', 'Mot de passe oublié ?')}
              </a>
            </div>

            <div id="login-error" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"></div>

            <button
              type="submit"
              id="login-submit"
              class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              ${tr('Sign in', 'Se connecter')}
            </button>

            <div class="text-center text-sm text-gray-600">
              ${tr("Don't have an account?", 'Pas encore de compte ?')} 
              <a href="#/signup" class="text-blue-600 hover:text-blue-700 font-medium">
                ${tr('Create an account', 'Créer un compte')}
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  `

  attachLanguageToggle(() => window.location.reload())

  // Handle form submission
  const form = document.getElementById('login-form')
  const submitBtn = document.getElementById('login-submit')
  const errorDiv = document.getElementById('login-error')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    // Disable submit button
    submitBtn.disabled = true
    submitBtn.textContent = tr('Signing in...', 'Connexion...')
    errorDiv.classList.add('hidden')

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || tr('Login failed', 'Erreur de connexion'))
      }

      // Store token and user info
      localStorage.setItem('carindex_token', data.token)
      localStorage.setItem('carindex_user', JSON.stringify(data.user))

      // Redirect to dashboard or search
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '#/dashboard'
      window.location.hash = redirectTo
      window.location.reload()
    } catch (error) {
      errorDiv.textContent = error.message
      errorDiv.classList.remove('hidden')
      submitBtn.disabled = false
      submitBtn.textContent = tr('Sign in', 'Se connecter')
    }
  })
}







