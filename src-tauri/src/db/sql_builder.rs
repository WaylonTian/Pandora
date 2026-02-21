// Database Manager - SQL Query Builder Module
// This module provides SQL query building functionality for SELECT, UPDATE statements,
// and pagination calculation.
//
// Validates: Requirements 4.2, 4.3, 4.4, 4.6

use super::types::Value;
use serde::{Deserialize, Serialize};

// ============================================================================
// Sort Direction
// ============================================================================

/// Sort direction for ORDER BY clause
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SortDirection {
    Ascending,
    Descending,
}

impl SortDirection {
    /// Returns the SQL keyword for this sort direction
    pub fn to_sql(&self) -> &'static str {
        match self {
            SortDirection::Ascending => "ASC",
            SortDirection::Descending => "DESC",
        }
    }
}

impl Default for SortDirection {
    fn default() -> Self {
        SortDirection::Ascending
    }
}

// ============================================================================
// Filter Operator
// ============================================================================

/// Comparison operators for WHERE clause conditions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FilterOperator {
    Equal,
    NotEqual,
    GreaterThan,
    GreaterThanOrEqual,
    LessThan,
    LessThanOrEqual,
    Like,
    NotLike,
    IsNull,
    IsNotNull,
    In,
    NotIn,
}

impl FilterOperator {
    /// Returns the SQL operator string
    pub fn to_sql(&self) -> &'static str {
        match self {
            FilterOperator::Equal => "=",
            FilterOperator::NotEqual => "<>",
            FilterOperator::GreaterThan => ">",
            FilterOperator::GreaterThanOrEqual => ">=",
            FilterOperator::LessThan => "<",
            FilterOperator::LessThanOrEqual => "<=",
            FilterOperator::Like => "LIKE",
            FilterOperator::NotLike => "NOT LIKE",
            FilterOperator::IsNull => "IS NULL",
            FilterOperator::IsNotNull => "IS NOT NULL",
            FilterOperator::In => "IN",
            FilterOperator::NotIn => "NOT IN",
        }
    }

    /// Returns true if this operator requires a value
    pub fn requires_value(&self) -> bool {
        !matches!(self, FilterOperator::IsNull | FilterOperator::IsNotNull)
    }
}

// ============================================================================
// Filter Condition
// ============================================================================

/// A single filter condition for WHERE clause
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterCondition {
    /// Column name to filter on
    pub column: String,
    /// Comparison operator
    pub operator: FilterOperator,
    /// Value to compare against (None for IS NULL/IS NOT NULL)
    pub value: Option<Value>,
}

impl FilterCondition {
    /// Creates a new filter condition
    pub fn new(column: impl Into<String>, operator: FilterOperator, value: Option<Value>) -> Self {
        Self {
            column: column.into(),
            operator,
            value,
        }
    }

    /// Creates an equality filter
    pub fn eq(column: impl Into<String>, value: Value) -> Self {
        Self::new(column, FilterOperator::Equal, Some(value))
    }

    /// Creates a not-equal filter
    pub fn ne(column: impl Into<String>, value: Value) -> Self {
        Self::new(column, FilterOperator::NotEqual, Some(value))
    }

    /// Creates a greater-than filter
    pub fn gt(column: impl Into<String>, value: Value) -> Self {
        Self::new(column, FilterOperator::GreaterThan, Some(value))
    }

    /// Creates a greater-than-or-equal filter
    pub fn gte(column: impl Into<String>, value: Value) -> Self {
        Self::new(column, FilterOperator::GreaterThanOrEqual, Some(value))
    }

    /// Creates a less-than filter
    pub fn lt(column: impl Into<String>, value: Value) -> Self {
        Self::new(column, FilterOperator::LessThan, Some(value))
    }

    /// Creates a less-than-or-equal filter
    pub fn lte(column: impl Into<String>, value: Value) -> Self {
        Self::new(column, FilterOperator::LessThanOrEqual, Some(value))
    }

    /// Creates a LIKE filter
    pub fn like(column: impl Into<String>, pattern: impl Into<String>) -> Self {
        Self::new(column, FilterOperator::Like, Some(Value::String(pattern.into())))
    }

    /// Creates an IS NULL filter
    pub fn is_null(column: impl Into<String>) -> Self {
        Self::new(column, FilterOperator::IsNull, None)
    }

    /// Creates an IS NOT NULL filter
    pub fn is_not_null(column: impl Into<String>) -> Self {
        Self::new(column, FilterOperator::IsNotNull, None)
    }
}

// ============================================================================
// Sort Column
// ============================================================================

/// A column with sort direction for ORDER BY clause
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortColumn {
    /// Column name to sort by
    pub column: String,
    /// Sort direction
    pub direction: SortDirection,
}

impl SortColumn {
    /// Creates a new sort column with ascending direction
    pub fn asc(column: impl Into<String>) -> Self {
        Self {
            column: column.into(),
            direction: SortDirection::Ascending,
        }
    }

    /// Creates a new sort column with descending direction
    pub fn desc(column: impl Into<String>) -> Self {
        Self {
            column: column.into(),
            direction: SortDirection::Descending,
        }
    }

    /// Creates a new sort column with specified direction
    pub fn new(column: impl Into<String>, direction: SortDirection) -> Self {
        Self {
            column: column.into(),
            direction,
        }
    }
}

// ============================================================================
// Pagination
// ============================================================================

/// Pagination information
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Pagination {
    /// Current page number (1-indexed)
    pub page: u64,
    /// Number of items per page
    pub page_size: u64,
}

impl Pagination {
    /// Creates a new pagination with the given page and page size
    pub fn new(page: u64, page_size: u64) -> Self {
        Self {
            page: page.max(1), // Ensure page is at least 1
            page_size: page_size.max(1), // Ensure page_size is at least 1
        }
    }

    /// Calculates the offset for SQL LIMIT/OFFSET clause
    /// 
    /// **Validates: Requirements 4.2**
    pub fn offset(&self) -> u64 {
        (self.page - 1) * self.page_size
    }

    /// Calculates the total number of pages for a given total row count
    /// 
    /// **Validates: Requirements 4.2**
    pub fn page_count(total_rows: u64, page_size: u64) -> u64 {
        if page_size == 0 {
            return 0;
        }
        // Ceiling division: (total + page_size - 1) / page_size
        (total_rows + page_size - 1) / page_size
    }

    /// Returns the limit value (same as page_size)
    pub fn limit(&self) -> u64 {
        self.page_size
    }
}

impl Default for Pagination {
    fn default() -> Self {
        Self {
            page: 1,
            page_size: 50,
        }
    }
}

// ============================================================================
// SQL Value Formatting
// ============================================================================

/// Escapes a string value for SQL by doubling single quotes
fn escape_sql_string(s: &str) -> String {
    s.replace('\'', "''")
}

/// Formats a Value for use in SQL
fn format_value(value: &Value) -> String {
    match value {
        Value::Null => "NULL".to_string(),
        Value::Bool(b) => if *b { "TRUE" } else { "FALSE" }.to_string(),
        Value::Integer(i) => i.to_string(),
        Value::Float(f) => {
            // Handle special float values
            if f.is_nan() {
                "'NaN'".to_string()
            } else if f.is_infinite() {
                if *f > 0.0 {
                    "'Infinity'".to_string()
                } else {
                    "'-Infinity'".to_string()
                }
            } else {
                f.to_string()
            }
        }
        Value::String(s) => format!("'{}'", escape_sql_string(s)),
        Value::Bytes(b) => {
            // Format as hex string
            let hex: String = b.iter().map(|byte| format!("{:02X}", byte)).collect();
            format!("X'{}'", hex)
        }
    }
}

/// Escapes an identifier (table name, column name) for SQL
/// Uses double quotes for standard SQL escaping
fn escape_identifier(name: &str) -> String {
    // Replace any double quotes with escaped double quotes
    let escaped = name.replace('"', "\"\"");
    format!("\"{}\"", escaped)
}

// ============================================================================
// SELECT Query Builder
// ============================================================================

/// Builder for SELECT queries
/// 
/// **Validates: Requirements 4.2, 4.3, 4.4**
#[derive(Debug, Clone, Default)]
pub struct SelectBuilder {
    table: String,
    columns: Vec<String>,
    filters: Vec<FilterCondition>,
    sort_columns: Vec<SortColumn>,
    pagination: Option<Pagination>,
}

impl SelectBuilder {
    /// Creates a new SELECT builder for the given table
    pub fn new(table: impl Into<String>) -> Self {
        Self {
            table: table.into(),
            columns: Vec::new(),
            filters: Vec::new(),
            sort_columns: Vec::new(),
            pagination: None,
        }
    }

    /// Adds columns to select (if empty, selects all with *)
    pub fn columns(mut self, columns: Vec<String>) -> Self {
        self.columns = columns;
        self
    }

    /// Adds a single column to select
    pub fn column(mut self, column: impl Into<String>) -> Self {
        self.columns.push(column.into());
        self
    }

    /// Adds filter conditions
    /// 
    /// **Validates: Requirements 4.4**
    pub fn filters(mut self, filters: Vec<FilterCondition>) -> Self {
        self.filters = filters;
        self
    }

    /// Adds a single filter condition
    pub fn filter(mut self, filter: FilterCondition) -> Self {
        self.filters.push(filter);
        self
    }

    /// Adds sort columns
    /// 
    /// **Validates: Requirements 4.3**
    pub fn sort(mut self, sort_columns: Vec<SortColumn>) -> Self {
        self.sort_columns = sort_columns;
        self
    }

    /// Adds a single sort column
    pub fn sort_by(mut self, column: impl Into<String>, direction: SortDirection) -> Self {
        self.sort_columns.push(SortColumn::new(column, direction));
        self
    }

    /// Sets pagination
    /// 
    /// **Validates: Requirements 4.2**
    pub fn paginate(mut self, pagination: Pagination) -> Self {
        self.pagination = Some(pagination);
        self
    }

    /// Sets pagination with page and page_size
    pub fn page(mut self, page: u64, page_size: u64) -> Self {
        self.pagination = Some(Pagination::new(page, page_size));
        self
    }

    /// Builds the SELECT SQL statement
    /// 
    /// **Validates: Requirements 4.2, 4.3, 4.4**
    pub fn build(&self) -> String {
        let mut sql = String::new();

        // SELECT clause
        sql.push_str("SELECT ");
        if self.columns.is_empty() {
            sql.push('*');
        } else {
            let cols: Vec<String> = self.columns.iter()
                .map(|c| escape_identifier(c))
                .collect();
            sql.push_str(&cols.join(", "));
        }

        // FROM clause
        sql.push_str(" FROM ");
        sql.push_str(&escape_identifier(&self.table));

        // WHERE clause
        if !self.filters.is_empty() {
            sql.push_str(" WHERE ");
            let conditions: Vec<String> = self.filters.iter()
                .map(|f| build_filter_condition(f))
                .collect();
            sql.push_str(&conditions.join(" AND "));
        }

        // ORDER BY clause
        if !self.sort_columns.is_empty() {
            sql.push_str(" ORDER BY ");
            let sorts: Vec<String> = self.sort_columns.iter()
                .map(|s| format!("{} {}", escape_identifier(&s.column), s.direction.to_sql()))
                .collect();
            sql.push_str(&sorts.join(", "));
        }

        // LIMIT/OFFSET clause (pagination)
        if let Some(pagination) = &self.pagination {
            sql.push_str(&format!(" LIMIT {} OFFSET {}", pagination.limit(), pagination.offset()));
        }

        sql
    }
}

/// Builds a single filter condition as SQL
fn build_filter_condition(filter: &FilterCondition) -> String {
    let column = escape_identifier(&filter.column);

    match filter.operator {
        FilterOperator::IsNull | FilterOperator::IsNotNull => {
            format!("{} {}", column, filter.operator.to_sql())
        }
        FilterOperator::In | FilterOperator::NotIn => {
            // For IN/NOT IN, value should be formatted as a list
            if let Some(value) = &filter.value {
                format!("{} {} ({})", column, filter.operator.to_sql(), format_value(value))
            } else {
                format!("{} {} ()", column, filter.operator.to_sql())
            }
        }
        _ => {
            if let Some(value) = &filter.value {
                format!("{} {} {}", column, filter.operator.to_sql(), format_value(value))
            } else {
                // Fallback for operators that require values but none provided
                format!("{} {} NULL", column, filter.operator.to_sql())
            }
        }
    }
}

// ============================================================================
// UPDATE Query Builder
// ============================================================================

/// A column-value pair for UPDATE SET clause
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnUpdate {
    /// Column name
    pub column: String,
    /// New value
    pub value: Value,
}

impl ColumnUpdate {
    /// Creates a new column update
    pub fn new(column: impl Into<String>, value: Value) -> Self {
        Self {
            column: column.into(),
            value,
        }
    }
}

/// Builder for UPDATE queries
/// 
/// **Validates: Requirements 4.6**
#[derive(Debug, Clone, Default)]
pub struct UpdateBuilder {
    table: String,
    updates: Vec<ColumnUpdate>,
    filters: Vec<FilterCondition>,
}

impl UpdateBuilder {
    /// Creates a new UPDATE builder for the given table
    pub fn new(table: impl Into<String>) -> Self {
        Self {
            table: table.into(),
            updates: Vec::new(),
            filters: Vec::new(),
        }
    }

    /// Sets the column updates
    pub fn set(mut self, updates: Vec<ColumnUpdate>) -> Self {
        self.updates = updates;
        self
    }

    /// Adds a single column update
    pub fn set_column(mut self, column: impl Into<String>, value: Value) -> Self {
        self.updates.push(ColumnUpdate::new(column, value));
        self
    }

    /// Sets the WHERE conditions
    pub fn where_conditions(mut self, filters: Vec<FilterCondition>) -> Self {
        self.filters = filters;
        self
    }

    /// Adds a single WHERE condition
    pub fn where_eq(mut self, column: impl Into<String>, value: Value) -> Self {
        self.filters.push(FilterCondition::eq(column, value));
        self
    }

    /// Builds the UPDATE SQL statement
    /// 
    /// **Validates: Requirements 4.6**
    pub fn build(&self) -> Option<String> {
        // Cannot build UPDATE without any columns to update
        if self.updates.is_empty() {
            return None;
        }

        let mut sql = String::new();

        // UPDATE clause
        sql.push_str("UPDATE ");
        sql.push_str(&escape_identifier(&self.table));

        // SET clause
        sql.push_str(" SET ");
        let sets: Vec<String> = self.updates.iter()
            .map(|u| format!("{} = {}", escape_identifier(&u.column), format_value(&u.value)))
            .collect();
        sql.push_str(&sets.join(", "));

        // WHERE clause
        if !self.filters.is_empty() {
            sql.push_str(" WHERE ");
            let conditions: Vec<String> = self.filters.iter()
                .map(|f| build_filter_condition(f))
                .collect();
            sql.push_str(&conditions.join(" AND "));
        }

        Some(sql)
    }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/// Builds a SELECT query for browsing table data with pagination, sorting, and filtering
/// 
/// **Validates: Requirements 4.2, 4.3, 4.4**
pub fn build_select_query(
    table: &str,
    columns: Option<Vec<String>>,
    filters: Option<Vec<FilterCondition>>,
    sort: Option<Vec<SortColumn>>,
    pagination: Option<Pagination>,
) -> String {
    let mut builder = SelectBuilder::new(table);

    if let Some(cols) = columns {
        builder = builder.columns(cols);
    }

    if let Some(f) = filters {
        builder = builder.filters(f);
    }

    if let Some(s) = sort {
        builder = builder.sort(s);
    }

    if let Some(p) = pagination {
        builder = builder.paginate(p);
    }

    builder.build()
}

/// Builds an UPDATE query for modifying table data
/// 
/// **Validates: Requirements 4.6**
pub fn build_update_query(
    table: &str,
    updates: Vec<ColumnUpdate>,
    filters: Vec<FilterCondition>,
) -> Option<String> {
    UpdateBuilder::new(table)
        .set(updates)
        .where_conditions(filters)
        .build()
}

/// Calculates pagination information
/// 
/// **Validates: Requirements 4.2**
pub fn calculate_pagination(total_rows: u64, page: u64, page_size: u64) -> (u64, u64, u64) {
    let pagination = Pagination::new(page, page_size);
    let page_count = Pagination::page_count(total_rows, page_size);
    let offset = pagination.offset();
    (page_count, offset, pagination.limit())
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // ========================================================================
    // Property-Based Tests for Pagination Calculation
    // **Validates: Requirements 4.2**
    // ========================================================================

    // ========================================================================
    // Property-Based Tests for SQL Query Builder
    // **Validates: Requirements 4.3, 4.4, 4.6**
    // ========================================================================

    mod sql_builder_property_tests {
        use super::*;
        use proptest::prelude::*;

        // ====================================================================
        // Arbitrary Generators for SQL Builder Types
        // ====================================================================

        /// Strategy for generating valid SQL identifier names (table/column names)
        /// Generates names that start with a letter and contain only alphanumeric chars and underscores
        fn arb_identifier() -> impl Strategy<Value = String> {
            "[a-zA-Z][a-zA-Z0-9_]{0,20}".prop_map(|s| s)
        }

        /// Strategy for generating SortDirection
        fn arb_sort_direction() -> impl Strategy<Value = SortDirection> {
            prop_oneof![
                Just(SortDirection::Ascending),
                Just(SortDirection::Descending),
            ]
        }

        /// Strategy for generating SortColumn
        fn arb_sort_column() -> impl Strategy<Value = SortColumn> {
            (arb_identifier(), arb_sort_direction())
                .prop_map(|(column, direction)| SortColumn { column, direction })
        }

        /// Strategy for generating FilterOperator (excluding IN/NOT IN for simplicity)
        fn arb_filter_operator() -> impl Strategy<Value = FilterOperator> {
            prop_oneof![
                Just(FilterOperator::Equal),
                Just(FilterOperator::NotEqual),
                Just(FilterOperator::GreaterThan),
                Just(FilterOperator::GreaterThanOrEqual),
                Just(FilterOperator::LessThan),
                Just(FilterOperator::LessThanOrEqual),
                Just(FilterOperator::Like),
                Just(FilterOperator::NotLike),
                Just(FilterOperator::IsNull),
                Just(FilterOperator::IsNotNull),
            ]
        }

        /// Strategy for generating Value types suitable for SQL
        fn arb_value() -> impl Strategy<Value = Value> {
            prop_oneof![
                Just(Value::Null),
                any::<bool>().prop_map(Value::Bool),
                any::<i64>().prop_map(Value::Integer),
                // Use finite floats only to avoid NaN/Infinity edge cases in comparisons
                (-1e10f64..1e10f64).prop_map(Value::Float),
                "[a-zA-Z0-9_ ]{0,50}".prop_map(|s| Value::String(s)),
            ]
        }

        /// Strategy for generating FilterCondition
        fn arb_filter_condition() -> impl Strategy<Value = FilterCondition> {
            (arb_identifier(), arb_filter_operator(), arb_value())
                .prop_map(|(column, operator, value)| {
                    // For IS NULL/IS NOT NULL, value should be None
                    let value = if operator.requires_value() {
                        Some(value)
                    } else {
                        None
                    };
                    FilterCondition { column, operator, value }
                })
        }

        /// Strategy for generating Pagination
        fn arb_pagination() -> impl Strategy<Value = Pagination> {
            (1u64..1000, 1u64..1000)
                .prop_map(|(page, page_size)| Pagination::new(page, page_size))
        }

        proptest! {
            #![proptest_config(ProptestConfig::with_cases(100))]

            // ================================================================
            // Property 7: SQL Query Builder
            // **Validates: Requirements 4.3, 4.4, 4.6**
            // ================================================================

            /// **Property 7: SQL Query Builder**
            /// **Validates: Requirements 4.3, 4.4, 4.6**
            /// 
            /// For any table name, the generated SELECT SQL should always contain
            /// SELECT and FROM clauses.
            #[test]
            fn select_sql_contains_select_and_from_clauses(
                table_name in arb_identifier()
            ) {
                let sql = SelectBuilder::new(&table_name).build();
                
                prop_assert!(
                    sql.contains("SELECT"),
                    "Generated SQL should contain SELECT clause: {}",
                    sql
                );
                prop_assert!(
                    sql.contains("FROM"),
                    "Generated SQL should contain FROM clause: {}",
                    sql
                );
            }

            /// **Property 7: SQL Query Builder**
            /// **Validates: Requirements 4.3, 4.4, 4.6**
            /// 
            /// For any table name, the table name should appear in the FROM clause.
            #[test]
            fn table_name_appears_in_from_clause(
                table_name in arb_identifier()
            ) {
                let sql = SelectBuilder::new(&table_name).build();
                
                // Table name should be escaped with double quotes
                let escaped_table = format!("\"{}\"", table_name);
                prop_assert!(
                    sql.contains(&escaped_table),
                    "Generated SQL should contain escaped table name '{}': {}",
                    escaped_table, sql
                );
                
                // Verify it appears after FROM
                let from_pos = sql.find("FROM").unwrap();
                let table_pos = sql.find(&escaped_table).unwrap();
                prop_assert!(
                    table_pos > from_pos,
                    "Table name should appear after FROM keyword: {}",
                    sql
                );
            }

            /// **Property 7: SQL Query Builder**
            /// **Validates: Requirements 4.4**
            /// 
            /// When filters are provided, the generated SQL should contain WHERE clause.
            #[test]
            fn select_with_filters_contains_where_clause(
                table_name in arb_identifier(),
                filters in prop::collection::vec(arb_filter_condition(), 1..5)
            ) {
                let sql = SelectBuilder::new(&table_name)
                    .filters(filters)
                    .build();
                
                prop_assert!(
                    sql.contains("WHERE"),
                    "Generated SQL with filters should contain WHERE clause: {}",
                    sql
                );
            }

            /// **Property 7: SQL Query Builder**
            /// **Validates: Requirements 4.4**
            /// 
            /// All filter columns should appear in the WHERE clause.
            #[test]
            fn all_filter_columns_appear_in_where_clause(
                table_name in arb_identifier(),
                filters in prop::collection::vec(arb_filter_condition(), 1..5)
            ) {
                let filter_columns: Vec<String> = filters.iter()
                    .map(|f| f.column.clone())
                    .collect();
                
                let sql = SelectBuilder::new(&table_name)
                    .filters(filters)
                    .build();
                
                // Find WHERE clause position
                let where_pos = sql.find("WHERE").unwrap();
                let where_clause = &sql[where_pos..];
                
                for column in &filter_columns {
                    let escaped_column = format!("\"{}\"", column);
                    prop_assert!(
                        where_clause.contains(&escaped_column),
                        "Filter column '{}' should appear in WHERE clause: {}",
                        column, sql
                    );
                }
            }

            /// **Property 7: SQL Query Builder**
            /// **Validates: Requirements 4.3**
            /// 
            /// When sort columns are provided, the generated SQL should contain ORDER BY clause.
            #[test]
            fn select_with_sort_contains_order_by_clause(
                table_name in arb_identifier(),
                sort_columns in prop::collection::vec(arb_sort_column(), 1..5)
            ) {
                let sql = SelectBuilder::new(&table_name)
                    .sort(sort_columns)
                    .build();
                
                prop_assert!(
                    sql.contains("ORDER BY"),
                    "Generated SQL with sort columns should contain ORDER BY clause: {}",
                    sql
                );
            }

            /// **Property 7: SQL Query Builder**
            /// **Validates: Requirements 4.3**
            /// 
            /// All sort columns should appear in the ORDER BY clause.
            #[test]
            fn all_sort_columns_appear_in_order_by_clause(
                table_name in arb_identifier(),
                sort_columns in prop::collection::vec(arb_sort_column(), 1..5)
            ) {
                let sort_column_names: Vec<String> = sort_columns.iter()
                    .map(|s| s.column.clone())
                    .collect();
                
                let sql = SelectBuilder::new(&table_name)
                    .sort(sort_columns)
                    .build();
                
                // Find ORDER BY clause position
                let order_by_pos = sql.find("ORDER BY").unwrap();
                let order_by_clause = &sql[order_by_pos..];
                
                for column in &sort_column_names {
                    let escaped_column = format!("\"{}\"", column);
                    prop_assert!(
                        order_by_clause.contains(&escaped_column),
                        "Sort column '{}' should appear in ORDER BY clause: {}",
                        column, sql
                    );
                }
            }

            /// **Property 7: SQL Query Builder**
            /// **Validates: Requirements 4.3, 4.4, 4.6**
            /// 
            /// Clauses should appear in correct order: SELECT -> FROM -> WHERE -> ORDER BY -> LIMIT
            #[test]
            fn clauses_appear_in_correct_order(
                table_name in arb_identifier(),
                filters in prop::collection::vec(arb_filter_condition(), 1..3),
                sort_columns in prop::collection::vec(arb_sort_column(), 1..3),
                pagination in arb_pagination()
            ) {
                let sql = SelectBuilder::new(&table_name)
                    .filters(filters)
                    .sort(sort_columns)
                    .paginate(pagination)
                    .build();
                
                // Get positions of each clause
                let select_pos = sql.find("SELECT").expect("SELECT should exist");
                let from_pos = sql.find("FROM").expect("FROM should exist");
                let where_pos = sql.find("WHERE").expect("WHERE should exist");
                let order_by_pos = sql.find("ORDER BY").expect("ORDER BY should exist");
                let limit_pos = sql.find("LIMIT").expect("LIMIT should exist");
                
                // Verify order: SELECT < FROM < WHERE < ORDER BY < LIMIT
                prop_assert!(
                    select_pos < from_pos,
                    "SELECT should come before FROM: {}",
                    sql
                );
                prop_assert!(
                    from_pos < where_pos,
                    "FROM should come before WHERE: {}",
                    sql
                );
                prop_assert!(
                    where_pos < order_by_pos,
                    "WHERE should come before ORDER BY: {}",
                    sql
                );
                prop_assert!(
                    order_by_pos < limit_pos,
                    "ORDER BY should come before LIMIT: {}",
                    sql
                );
            }

            /// **Property 7: SQL Query Builder**
            /// **Validates: Requirements 4.3, 4.4, 4.6**
            /// 
            /// When pagination is provided, the generated SQL should contain LIMIT and OFFSET.
            #[test]
            fn select_with_pagination_contains_limit_offset(
                table_name in arb_identifier(),
                pagination in arb_pagination()
            ) {
                let sql = SelectBuilder::new(&table_name)
                    .paginate(pagination)
                    .build();
                
                prop_assert!(
                    sql.contains("LIMIT"),
                    "Generated SQL with pagination should contain LIMIT: {}",
                    sql
                );
                prop_assert!(
                    sql.contains("OFFSET"),
                    "Generated SQL with pagination should contain OFFSET: {}",
                    sql
                );
            }

            /// **Property 7: SQL Query Builder**
            /// **Validates: Requirements 4.3, 4.4, 4.6**
            /// 
            /// Without filters, the generated SQL should NOT contain WHERE clause.
            #[test]
            fn select_without_filters_has_no_where_clause(
                table_name in arb_identifier()
            ) {
                let sql = SelectBuilder::new(&table_name).build();
                
                prop_assert!(
                    !sql.contains("WHERE"),
                    "Generated SQL without filters should NOT contain WHERE clause: {}",
                    sql
                );
            }

            /// **Property 7: SQL Query Builder**
            /// **Validates: Requirements 4.3, 4.4, 4.6**
            /// 
            /// Without sort columns, the generated SQL should NOT contain ORDER BY clause.
            #[test]
            fn select_without_sort_has_no_order_by_clause(
                table_name in arb_identifier()
            ) {
                let sql = SelectBuilder::new(&table_name).build();
                
                prop_assert!(
                    !sql.contains("ORDER BY"),
                    "Generated SQL without sort columns should NOT contain ORDER BY clause: {}",
                    sql
                );
            }

            /// **Property 7: SQL Query Builder**
            /// **Validates: Requirements 4.3, 4.4, 4.6**
            /// 
            /// Without pagination, the generated SQL should NOT contain LIMIT clause.
            #[test]
            fn select_without_pagination_has_no_limit_clause(
                table_name in arb_identifier()
            ) {
                let sql = SelectBuilder::new(&table_name).build();
                
                prop_assert!(
                    !sql.contains("LIMIT"),
                    "Generated SQL without pagination should NOT contain LIMIT clause: {}",
                    sql
                );
            }

            /// **Property 7: SQL Query Builder**
            /// **Validates: Requirements 4.3, 4.4, 4.6**
            /// 
            /// Sort directions should be correctly represented in ORDER BY clause.
            #[test]
            fn sort_directions_correctly_represented(
                table_name in arb_identifier(),
                sort_columns in prop::collection::vec(arb_sort_column(), 1..5)
            ) {
                let sql = SelectBuilder::new(&table_name)
                    .sort(sort_columns.clone())
                    .build();
                
                for sort_col in &sort_columns {
                    let direction_str = sort_col.direction.to_sql();
                    let escaped_column = format!("\"{}\"", sort_col.column);
                    
                    // The column should be followed by its direction
                    let pattern = format!("{} {}", escaped_column, direction_str);
                    prop_assert!(
                        sql.contains(&pattern),
                        "Sort column '{}' should be followed by direction '{}': {}",
                        sort_col.column, direction_str, sql
                    );
                }
            }

            /// **Property 7: SQL Query Builder**
            /// **Validates: Requirements 4.3, 4.4, 4.6**
            /// 
            /// Complete query with all components should be syntactically structured correctly.
            #[test]
            fn complete_query_structure_is_valid(
                table_name in arb_identifier(),
                columns in prop::collection::vec(arb_identifier(), 0..5),
                filters in prop::collection::vec(arb_filter_condition(), 0..3),
                sort_columns in prop::collection::vec(arb_sort_column(), 0..3),
                use_pagination in any::<bool>(),
                pagination in arb_pagination()
            ) {
                let mut builder = SelectBuilder::new(&table_name);
                
                if !columns.is_empty() {
                    builder = builder.columns(columns.clone());
                }
                if !filters.is_empty() {
                    builder = builder.filters(filters.clone());
                }
                if !sort_columns.is_empty() {
                    builder = builder.sort(sort_columns.clone());
                }
                if use_pagination {
                    builder = builder.paginate(pagination);
                }
                
                let sql = builder.build();
                
                // Basic structure validation
                prop_assert!(sql.starts_with("SELECT"), "SQL should start with SELECT: {}", sql);
                prop_assert!(sql.contains("FROM"), "SQL should contain FROM: {}", sql);
                
                // Conditional clause presence
                if !filters.is_empty() {
                    prop_assert!(sql.contains("WHERE"), "SQL with filters should have WHERE: {}", sql);
                }
                if !sort_columns.is_empty() {
                    prop_assert!(sql.contains("ORDER BY"), "SQL with sort should have ORDER BY: {}", sql);
                }
                if use_pagination {
                    prop_assert!(sql.contains("LIMIT"), "SQL with pagination should have LIMIT: {}", sql);
                }
            }
        }
    }

    mod pagination_property_tests {
        use super::*;
        use proptest::prelude::*;

        proptest! {
            #![proptest_config(ProptestConfig::with_cases(100))]

            /// **Property 6: Pagination Calculation**
            /// **Validates: Requirements 4.2**
            /// 
            /// For any total row count and page size, the calculated page count 
            /// should equal ceil(total / page_size).
            #[test]
            fn page_count_equals_ceiling_division(
                total_rows in 0u64..1_000_000,
                page_size in 1u64..10_000
            ) {
                let calculated = Pagination::page_count(total_rows, page_size);
                let expected = (total_rows as f64 / page_size as f64).ceil() as u64;
                
                prop_assert_eq!(
                    calculated, 
                    expected,
                    "page_count({}, {}) should be ceil({}/{}) = {}",
                    total_rows, page_size, total_rows, page_size, expected
                );
            }

            /// **Property 6: Pagination Calculation**
            /// **Validates: Requirements 4.2**
            /// 
            /// For any page number, the offset should equal (page - 1) * page_size.
            #[test]
            fn offset_equals_page_minus_one_times_page_size(
                page in 1u64..10_000,
                page_size in 1u64..10_000
            ) {
                let pagination = Pagination::new(page, page_size);
                let calculated_offset = pagination.offset();
                let expected_offset = (page - 1) * page_size;
                
                prop_assert_eq!(
                    calculated_offset,
                    expected_offset,
                    "offset for page {} with page_size {} should be ({} - 1) * {} = {}",
                    page, page_size, page, page_size, expected_offset
                );
            }

            /// **Property 6: Pagination Calculation**
            /// **Validates: Requirements 4.2**
            /// 
            /// Page 1 always has offset 0, regardless of page_size.
            #[test]
            fn page_one_always_has_offset_zero(
                page_size in 1u64..100_000
            ) {
                let pagination = Pagination::new(1, page_size);
                
                prop_assert_eq!(
                    pagination.offset(),
                    0,
                    "Page 1 with page_size {} should have offset 0, got {}",
                    page_size, pagination.offset()
                );
            }

            /// **Property 6: Pagination Calculation**
            /// **Validates: Requirements 4.2**
            /// 
            /// Page count is 0 when total_rows is 0, regardless of page_size.
            #[test]
            fn page_count_is_zero_when_total_rows_is_zero(
                page_size in 1u64..100_000
            ) {
                let page_count = Pagination::page_count(0, page_size);
                
                prop_assert_eq!(
                    page_count,
                    0,
                    "Page count for 0 rows with page_size {} should be 0, got {}",
                    page_size, page_count
                );
            }

            /// **Property 6: Pagination Calculation**
            /// **Validates: Requirements 4.2**
            /// 
            /// Additional property: The offset for page N+1 should be exactly page_size 
            /// more than the offset for page N.
            #[test]
            fn consecutive_pages_have_page_size_offset_difference(
                page in 1u64..9_999,
                page_size in 1u64..10_000
            ) {
                let pagination_n = Pagination::new(page, page_size);
                let pagination_n_plus_1 = Pagination::new(page + 1, page_size);
                
                let offset_diff = pagination_n_plus_1.offset() - pagination_n.offset();
                
                prop_assert_eq!(
                    offset_diff,
                    page_size,
                    "Offset difference between page {} and {} should be {}, got {}",
                    page + 1, page, page_size, offset_diff
                );
            }

            /// **Property 6: Pagination Calculation**
            /// **Validates: Requirements 4.2**
            /// 
            /// Additional property: For any total_rows and page_size, if we have N pages,
            /// then (N-1) * page_size < total_rows <= N * page_size (when total_rows > 0).
            #[test]
            fn page_count_bounds_total_rows(
                total_rows in 1u64..1_000_000,
                page_size in 1u64..10_000
            ) {
                let page_count = Pagination::page_count(total_rows, page_size);
                
                // (page_count - 1) * page_size < total_rows
                let lower_bound = (page_count - 1) * page_size;
                prop_assert!(
                    lower_bound < total_rows,
                    "Lower bound {} should be less than total_rows {}",
                    lower_bound, total_rows
                );
                
                // total_rows <= page_count * page_size
                let upper_bound = page_count * page_size;
                prop_assert!(
                    total_rows <= upper_bound,
                    "total_rows {} should be <= upper bound {}",
                    total_rows, upper_bound
                );
            }
        }
    }

    // ========================================================================
    // Pagination Tests
    // ========================================================================

    #[test]
    fn test_pagination_offset() {
        // Page 1 should have offset 0
        let p = Pagination::new(1, 10);
        assert_eq!(p.offset(), 0);

        // Page 2 should have offset 10
        let p = Pagination::new(2, 10);
        assert_eq!(p.offset(), 10);

        // Page 5 with page_size 20 should have offset 80
        let p = Pagination::new(5, 20);
        assert_eq!(p.offset(), 80);
    }

    #[test]
    fn test_pagination_page_count() {
        // 100 rows with page_size 10 = 10 pages
        assert_eq!(Pagination::page_count(100, 10), 10);

        // 101 rows with page_size 10 = 11 pages
        assert_eq!(Pagination::page_count(101, 10), 11);

        // 0 rows = 0 pages
        assert_eq!(Pagination::page_count(0, 10), 0);

        // 1 row with page_size 10 = 1 page
        assert_eq!(Pagination::page_count(1, 10), 1);

        // Edge case: page_size 0 should return 0
        assert_eq!(Pagination::page_count(100, 0), 0);
    }

    #[test]
    fn test_pagination_minimum_values() {
        // Page 0 should be normalized to 1
        let p = Pagination::new(0, 10);
        assert_eq!(p.page, 1);
        assert_eq!(p.offset(), 0);

        // Page size 0 should be normalized to 1
        let p = Pagination::new(1, 0);
        assert_eq!(p.page_size, 1);
    }

    // ========================================================================
    // SELECT Builder Tests
    // ========================================================================

    #[test]
    fn test_select_all_columns() {
        let sql = SelectBuilder::new("users").build();
        assert_eq!(sql, "SELECT * FROM \"users\"");
    }

    #[test]
    fn test_select_specific_columns() {
        let sql = SelectBuilder::new("users")
            .columns(vec!["id".to_string(), "name".to_string(), "email".to_string()])
            .build();
        assert_eq!(sql, "SELECT \"id\", \"name\", \"email\" FROM \"users\"");
    }

    #[test]
    fn test_select_with_filter() {
        let sql = SelectBuilder::new("users")
            .filter(FilterCondition::eq("status", Value::String("active".to_string())))
            .build();
        assert_eq!(sql, "SELECT * FROM \"users\" WHERE \"status\" = 'active'");
    }

    #[test]
    fn test_select_with_multiple_filters() {
        let sql = SelectBuilder::new("users")
            .filter(FilterCondition::eq("status", Value::String("active".to_string())))
            .filter(FilterCondition::gt("age", Value::Integer(18)))
            .build();
        assert_eq!(sql, "SELECT * FROM \"users\" WHERE \"status\" = 'active' AND \"age\" > 18");
    }

    #[test]
    fn test_select_with_sort() {
        let sql = SelectBuilder::new("users")
            .sort_by("name", SortDirection::Ascending)
            .build();
        assert_eq!(sql, "SELECT * FROM \"users\" ORDER BY \"name\" ASC");
    }

    #[test]
    fn test_select_with_multiple_sorts() {
        let sql = SelectBuilder::new("users")
            .sort_by("last_name", SortDirection::Ascending)
            .sort_by("first_name", SortDirection::Descending)
            .build();
        assert_eq!(sql, "SELECT * FROM \"users\" ORDER BY \"last_name\" ASC, \"first_name\" DESC");
    }

    #[test]
    fn test_select_with_pagination() {
        let sql = SelectBuilder::new("users")
            .page(2, 25)
            .build();
        assert_eq!(sql, "SELECT * FROM \"users\" LIMIT 25 OFFSET 25");
    }

    #[test]
    fn test_select_complete_query() {
        let sql = SelectBuilder::new("orders")
            .columns(vec!["id".to_string(), "total".to_string(), "status".to_string()])
            .filter(FilterCondition::eq("status", Value::String("pending".to_string())))
            .filter(FilterCondition::gte("total", Value::Float(100.0)))
            .sort_by("created_at", SortDirection::Descending)
            .page(1, 50)
            .build();
        
        assert_eq!(
            sql,
            "SELECT \"id\", \"total\", \"status\" FROM \"orders\" WHERE \"status\" = 'pending' AND \"total\" >= 100 ORDER BY \"created_at\" DESC LIMIT 50 OFFSET 0"
        );
    }

    #[test]
    fn test_select_with_null_filter() {
        let sql = SelectBuilder::new("users")
            .filter(FilterCondition::is_null("deleted_at"))
            .build();
        assert_eq!(sql, "SELECT * FROM \"users\" WHERE \"deleted_at\" IS NULL");
    }

    #[test]
    fn test_select_with_like_filter() {
        let sql = SelectBuilder::new("users")
            .filter(FilterCondition::like("name", "%John%"))
            .build();
        assert_eq!(sql, "SELECT * FROM \"users\" WHERE \"name\" LIKE '%John%'");
    }

    // ========================================================================
    // UPDATE Builder Tests
    // ========================================================================

    #[test]
    fn test_update_single_column() {
        let sql = UpdateBuilder::new("users")
            .set_column("name", Value::String("John".to_string()))
            .where_eq("id", Value::Integer(1))
            .build();
        
        assert_eq!(sql, Some("UPDATE \"users\" SET \"name\" = 'John' WHERE \"id\" = 1".to_string()));
    }

    #[test]
    fn test_update_multiple_columns() {
        let sql = UpdateBuilder::new("users")
            .set_column("name", Value::String("John".to_string()))
            .set_column("age", Value::Integer(30))
            .set_column("active", Value::Bool(true))
            .where_eq("id", Value::Integer(1))
            .build();
        
        assert_eq!(
            sql,
            Some("UPDATE \"users\" SET \"name\" = 'John', \"age\" = 30, \"active\" = TRUE WHERE \"id\" = 1".to_string())
        );
    }

    #[test]
    fn test_update_without_where() {
        let sql = UpdateBuilder::new("users")
            .set_column("status", Value::String("inactive".to_string()))
            .build();
        
        assert_eq!(sql, Some("UPDATE \"users\" SET \"status\" = 'inactive'".to_string()));
    }

    #[test]
    fn test_update_empty_returns_none() {
        let sql = UpdateBuilder::new("users").build();
        assert_eq!(sql, None);
    }

    #[test]
    fn test_update_with_null_value() {
        let sql = UpdateBuilder::new("users")
            .set_column("deleted_at", Value::Null)
            .where_eq("id", Value::Integer(1))
            .build();
        
        assert_eq!(sql, Some("UPDATE \"users\" SET \"deleted_at\" = NULL WHERE \"id\" = 1".to_string()));
    }

    // ========================================================================
    // Value Formatting Tests
    // ========================================================================

    #[test]
    fn test_format_string_with_quotes() {
        let value = Value::String("O'Brien".to_string());
        assert_eq!(format_value(&value), "'O''Brien'");
    }

    #[test]
    fn test_format_bytes() {
        let value = Value::Bytes(vec![0xDE, 0xAD, 0xBE, 0xEF]);
        assert_eq!(format_value(&value), "X'DEADBEEF'");
    }

    // ========================================================================
    // Identifier Escaping Tests
    // ========================================================================

    #[test]
    fn test_escape_identifier_with_quotes() {
        let escaped = escape_identifier("table\"name");
        assert_eq!(escaped, "\"table\"\"name\"");
    }

    #[test]
    fn test_escape_identifier_simple() {
        let escaped = escape_identifier("users");
        assert_eq!(escaped, "\"users\"");
    }

    // ========================================================================
    // Convenience Function Tests
    // ========================================================================

    #[test]
    fn test_build_select_query_function() {
        let sql = build_select_query(
            "products",
            Some(vec!["id".to_string(), "name".to_string()]),
            Some(vec![FilterCondition::gt("price", Value::Float(10.0))]),
            Some(vec![SortColumn::desc("price")]),
            Some(Pagination::new(1, 20)),
        );
        
        assert_eq!(
            sql,
            "SELECT \"id\", \"name\" FROM \"products\" WHERE \"price\" > 10 ORDER BY \"price\" DESC LIMIT 20 OFFSET 0"
        );
    }

    #[test]
    fn test_build_update_query_function() {
        let sql = build_update_query(
            "products",
            vec![ColumnUpdate::new("price", Value::Float(19.99))],
            vec![FilterCondition::eq("id", Value::Integer(42))],
        );
        
        assert_eq!(
            sql,
            Some("UPDATE \"products\" SET \"price\" = 19.99 WHERE \"id\" = 42".to_string())
        );
    }

    #[test]
    fn test_calculate_pagination_function() {
        let (page_count, offset, limit) = calculate_pagination(95, 3, 20);
        assert_eq!(page_count, 5); // ceil(95/20) = 5
        assert_eq!(offset, 40);    // (3-1) * 20 = 40
        assert_eq!(limit, 20);
    }
}
