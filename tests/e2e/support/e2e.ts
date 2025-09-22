// E2E support file
import '@cypress/code-coverage/support';

// Custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(username?: string, password?: string): Chainable<void>;
      createRegistry(name: string, url: string): Chainable<void>;
      deployInstance(serverId: string, config: any): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (username = 'admin', password = 'admin') => {
  cy.visit('/login');
  cy.get('[data-testid=username-input]').type(username);
  cy.get('[data-testid=password-input]').type(password);
  cy.get('[data-testid=login-button]').click();
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('createRegistry', (name: string, url: string) => {
  cy.get('[data-testid=add-registry-button]').click();
  cy.get('[data-testid=registry-name-input]').type(name);
  cy.get('[data-testid=registry-url-input]').type(url);
  cy.get('[data-testid=create-registry-button]').click();
});

Cypress.Commands.add('deployInstance', (serverId: string, config: any) => {
  cy.get(`[data-testid=server-${serverId}]`).click();
  cy.get('[data-testid=deploy-button]').click();
  cy.get('[data-testid=instance-name-input]').type(config.name);
  cy.get('[data-testid=namespace-input]').type(config.namespace);
  cy.get('[data-testid=deploy-instance-button]').click();
});