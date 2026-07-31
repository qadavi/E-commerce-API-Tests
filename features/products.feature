Feature: Product management - admin authorization

  Admin-only write access to the product catalog: customers must be
  blocked from creating products, and invalid product data must be
  rejected.

  @admin
  Scenario: A customer cannot create a product
    Given I am authenticated as "customer1"
    When I attempt to create a product with name "Gaming Chair", price 199.99 and stock 5
    Then the response status should be 403
    And the response should contain an error message

  @admin
  Scenario: Admin creating a product without a price is rejected
    Given I am authenticated as "admin"
    When I attempt to create a product without a price
    Then the response status should be 400
    And the response should contain an error message
