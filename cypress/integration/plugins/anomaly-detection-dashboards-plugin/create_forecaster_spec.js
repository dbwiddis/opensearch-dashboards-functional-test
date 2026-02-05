/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { AD_FIXTURE_BASE_PATH, FORECAST_URL } from '../../../utils/constants';
import { selectTopItemFromFilter } from '../../../utils/helpers';

context('create forecaster workflow', () => {
  const TEST_FORECASTER_NAME = 'test-forecaster';
  const TEST_FORECASTER_DESCRIPTION = 'Some test forecaster description.';
  const TEST_FIELD_TO_FORECAST = 'value_field'; // field name for forecasting
  const TEST_INDEX_NAME = 'sample-forecast-index';

  // Index some sample data first
  beforeEach(() => {
    cy.visit(FORECAST_URL.CREATE_FORECASTER, { timeout: 10000 });
    cy.deleteAllIndices();
    cy.deleteForecastIndices();

    // reuse AD sample data (same approach as create_detector_spec.js)
    cy.fixture(AD_FIXTURE_BASE_PATH + 'sample_test_data.txt').then((data) => {
      cy.request({
        method: 'POST',
        form: false,
        url: 'api/console/proxy',
        headers: {
          'content-type': 'application/json;charset=UTF-8',
          'osd-xsrf': true,
        },
        qs: {
          path: `${TEST_INDEX_NAME}/_bulk?refresh=true`,
          method: 'POST',
        },
        body: data,
      });
    });
  });

  // Clean up created resources
  afterEach(() => {
    cy.deleteAllIndices();
    cy.deleteForecastIndices();
  });

  it('Full creation', () => {
    // Define Forecaster step
    cy.visit(FORECAST_URL.CREATE_FORECASTER);
    cy.getElementByTestId('defineOrEditForecasterTitle').should('exist');
    cy.getElementByTestId('forecasterNameTextInput').type(TEST_FORECASTER_NAME);
    cy.getElementByTestId('forecasterDescriptionTextInput').type(
      TEST_FORECASTER_DESCRIPTION
    );
    cy.getElementByTestId('indicesFilter').click().type(`${TEST_INDEX_NAME}{enter}`, { delay: 100 });
    cy.wait(2000);
    // Type timestamp field directly instead of selecting from dropdown
    cy.getElementByTestId('timestampFilter').type('timestamp{enter}');

    cy.getElementByTestId('featureNameTextInput-0').type(
      TEST_FIELD_TO_FORECAST
    );
    selectTopItemFromFilter('featureFieldTextInput-0', false);

    cy.getElementByTestId('defineForecasterNextButton').click();
    cy.getElementByTestId('defineOrEditForecasterTitle').should('not.exist');
    cy.getElementByTestId('configureOrEditModelConfigurationTitle').should(
      'exist'
    );

    cy.getElementByTestId('suggestParametersButton').click();
    cy.getElementByTestId('suggestParametersDialogTitle').should('exist');
    cy.getElementByTestId('generateSuggestionsButton').click();
    cy.getElementByTestId('suggestedParametersResult').should('exist');
    // not enough data to determine a suitable interval
    cy.contains('Unable to determine a suitable interval').should('be.visible');
    cy.getElementByTestId('useSuggestedParametersButton').click();

    // The dialog should close and we're back on the model configuration page
    cy.getElementByTestId('suggestParametersDialogTitle').should('not.exist');

    // Now manually enter the interval value
    cy.get('input[name="interval"]').type('10');

    // Verify validation for history field
    cy.get('input[name="history"]').clear().type('3');
    cy.getElementByTestId('createTestForecasterButton').click();

    // Assert that the click does not cause a redirect
    cy.url().should('include', 'create-forecaster');

    // Assert that the validation error message is visible
    cy.contains('Must be an integer of at least 40.').should('be.visible');

    // enter valid history value and try again.
    cy.get('input[name="history"]').clear().type('40');

    cy.getElementByTestId('createTestForecasterButton').click();

    // Wait for the forecaster to be created.
    cy.wait(5000);

    // Lands on the forecaster details page by default.
    cy.getElementByTestId('forecasterSettingsHeader').should('exist');
    cy.getElementByTestId('forecasterDetailsHeader').should('exist');
  });
});
