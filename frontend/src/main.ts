// Main Application Entry Point
// Clean, modular orchestration of components

import './styles/main.css'

// Import utilities
import { applyTheme, getCurrentTheme, watchSystemTheme } from './utils/theme'
import { initRouter, getCurrentPage, getPageById } from './utils/router'
import { isAuthenticated, isAdmin, onAuthChange } from './utils/auth'

// Import components
import { renderHeader, updatePageTitle, updateDocumentTitle, attachHeaderListeners, updateThemeButton } from './components/header'
import { renderSidebar, getSidebarState, toggleSidebar, updateActiveNavItem, attachSidebarListeners } from './components/sidebar'

// Import pages
import { homePage, attachHomeListeners } from './pages/home'
import { sessionsPage, attachSessionsListeners } from './pages/sessions'
import { aboutPage, attachAboutListeners } from './pages/about'
import { settingsPage, attachSettingsListeners } from './pages/settings'
import { llmTxtPage, attachLlmTxtListeners } from './pages/llm-txt'
import { loginPage, attachLoginListeners } from './pages/login'
import { accountPage, attachAccountListeners } from './pages/account'
import { usersPage, attachUsersListeners } from './pages/users'
import { claudeSdkPage, attachClaudeSdkListeners } from './pages/claude-sdk'

// Define all pages (users page only visible to admins)
function getPages() {
  const basePages = [homePage, sessionsPage, aboutPage, settingsPage, llmTxtPage, claudeSdkPage]

  // Always include account page - it will redirect to login if not authenticated
  basePages.push(accountPage)

  if (isAuthenticated()) {
    if (isAdmin()) {
      basePages.push(usersPage)
    }
  } else {
    basePages.push(loginPage)
  }

  return basePages
}

const pages = getPages()

/**
 * Render a page by ID
 * @param pageId Page ID to render
 */
function renderPage(pageId: string): void {
  const page = getPageById(pageId)
  const contentArea = document.querySelector<HTMLDivElement>('#page-content')

  if (contentArea) {
    contentArea.innerHTML = page.render()

    // Update active state in sidebar
    updateActiveNavItem(pageId)

    // Update page title in header
    updatePageTitle(page.title)

    // Update document title
    updateDocumentTitle()

    // Attach page-specific event listeners
    attachPageEventListeners(pageId)
  }
}

/**
 * Attach event listeners for dynamic page content
 * @param pageId Page ID to attach listeners for
 */
function attachPageEventListeners(pageId: string): void {
  switch (pageId) {
    case 'home':
      attachHomeListeners()
      break
    case 'sessions':
      attachSessionsListeners()
      break
    case 'about':
      attachAboutListeners()
      break
    case 'settings':
      attachSettingsListeners()
      break
    case 'llm-txt':
      attachLlmTxtListeners()
      break
    case 'login':
      attachLoginListeners()
      break
    case 'account':
      attachAccountListeners()
      break
    case 'users':
      attachUsersListeners()
      break
    case 'claude-sdk':
      attachClaudeSdkListeners()
      break
  }
}

/**
 * Initialize the application
 */
function init(): void {
  // Initialize theme
  applyTheme(getCurrentTheme())

  // Initialize router
  initRouter(pages, (pageId) => {
    renderPage(pageId)
  })

  // Get current page
  const currentPage = getCurrentPage()
  const currentPageTitle = getPageById(currentPage).title

  // Set up HTML structure
  const appContainer = document.querySelector<HTMLDivElement>('#app')
  if (appContainer) {
    appContainer.innerHTML = `
      <div class="app-container${getSidebarState() ? ' sidebar-collapsed' : ''}">
        ${renderHeader(currentPageTitle)}
        <div class="content-wrapper">
          ${renderSidebar(pages, currentPage)}
          <main class="content">
            <div id="page-content" class="page-container">
              <!-- Page content will be rendered here -->
            </div>
          </main>
        </div>
      </div>
    `
  }

  // Attach event listeners
  attachHeaderListeners(toggleSidebar)
  attachSidebarListeners()

  // Render initial page
  renderPage(currentPage)

  // Listen for custom render page events (from sessions page)
  window.addEventListener('renderPage', ((e: CustomEvent) => {
    const { pageId } = e.detail
    renderPage(pageId)
  }) as EventListener)

  // Watch for system theme changes
  watchSystemTheme((newTheme) => {
    applyTheme(newTheme)
    updateThemeButton()
    updateDocumentTitle()
  })

  // Watch for auth state changes
  onAuthChange((user) => {
    // Auth state changed, you might want to reload the app
    // For now, we'll just log it
    console.log('Auth state changed:', user)
  })
}

// Initialize the application when DOM is ready
init()
