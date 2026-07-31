Feature: Order management - critical paths

  Critical-path coverage for the order flow: placing an order, retrieving
  it, and the two most important negative paths - cross-customer access
  and missing authentication.

  @critical
  Scenario: Placing an order with sufficient stock
    Given I am authenticated as "customer1"
    When I place an order for 1 unit of "Wireless Mouse"
    Then the response status should be 201
    And the response should have a valid "orderId" (UUID format)
    And the response should have a valid "createdAt" timestamp
    And the order status should be "pending"
    And the order should contain the correct product "Wireless Mouse"
    And the order quantity should be 1
    And the order total should be calculated correctly
    And the order should belong to "customer1"

  @critical
  Scenario: Retrieving my own order
    Given I am authenticated as "customer1"
    And I have placed an order for 1 unit of "Wireless Mouse"
    When I retrieve that order
    Then the response status should be 200
    And the order should belong to "customer1"

  @critical
  Scenario: A different customer cannot cancel my order
    Given I am authenticated as "customer1"
    And I have placed an order for 1 unit of "Wireless Mouse"
    When I authenticate as "customer2"
    And I cancel that order
    Then the response status should be 403
    And the response should contain an error message
    When I retrieve that order
    Then the order status should be "pending"

  @critical
  Scenario: Placing an order without authentication is rejected
    Given I am not authenticated
    When I place an order for 1 unit of "Wireless Mouse"
    Then the response status should be 401
    And the response should contain an error message

  @business-rule
  Scenario: Placing an order that exceeds available stock is rejected
    Given I am authenticated as "customer1"
    When I place an order for 4 units of "USB-C Hub"
    Then the response status should be 400
    And the response should contain an error message
    And the stock for "USB-C Hub" should still be 3
