/// <reference types="cypress" />

describe('Smoke Test', () => {
  it('abre a aplicação e exibe o título principal', () => {
    cy.visit('/');
    cy.contains('Prop-Stream');
  });
});
