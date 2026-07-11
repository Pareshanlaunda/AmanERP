# MySQL 8.4 Reference Manual — complete chapter map

**Live manual:** https://dev.mysql.com/doc/refman/8.4/en/  
**PDF / full download:** linked from that hub  
**Always fetch** the chapter/section page. AMAN ERP primary DB is Postgres/Supabase; use MySQL TOC when user asks MySQL or Azure Database for MySQL.

Official manuals are huge (40MB+ PDF). This file is the **navigation map** of the Reference Manual. Content = fetch URL.

## Core chapters (8.4)

| Ch | Topic | Entry URL |
|----|-------|-----------|
| Pref | Preface and Legal Notices | https://dev.mysql.com/doc/refman/8.4/en/preface.html |
| 1 | General Information | https://dev.mysql.com/doc/refman/8.4/en/introduction.html |
| 2 | Installing and Upgrading MySQL | https://dev.mysql.com/doc/refman/8.4/en/installing.html |
| 3 | Tutorial | https://dev.mysql.com/doc/refman/8.4/en/tutorial.html |
| 4 | MySQL Programs | https://dev.mysql.com/doc/refman/8.4/en/programs.html |
| 5 | MySQL Server Administration | https://dev.mysql.com/doc/refman/8.4/en/server-administration.html |
| 6 | Security | https://dev.mysql.com/doc/refman/8.4/en/security.html |
| 7 | Backup and Recovery | https://dev.mysql.com/doc/refman/8.4/en/backup-and-recovery.html |
| 8 | Optimization | https://dev.mysql.com/doc/refman/8.4/en/optimization.html |
| 9 | Language Structure | https://dev.mysql.com/doc/refman/8.4/en/language-structure.html |
| 10 | Character Sets, Collations, Unicode | https://dev.mysql.com/doc/refman/8.4/en/charset.html |
| 11 | Data Types | https://dev.mysql.com/doc/refman/8.4/en/data-types.html |
| 12 | Functions and Operators | https://dev.mysql.com/doc/refman/8.4/en/functions.html |
| 13 | SQL Statements | https://dev.mysql.com/doc/refman/8.4/en/sql-statements.html |
| 14 | The InnoDB Storage Engine | https://dev.mysql.com/doc/refman/8.4/en/innodb-storage-engine.html |
| 15 | Alternative Storage Engines | https://dev.mysql.com/doc/refman/8.4/en/storage-engines.html |
| 16 | Replication | https://dev.mysql.com/doc/refman/8.4/en/replication.html |
| 17 | Group Replication | https://dev.mysql.com/doc/refman/8.4/en/group-replication.html |
| 18 | MySQL Shell | (see manual TOC / shell docs) |
| 19 | Using MySQL as a Document Store | https://dev.mysql.com/doc/refman/8.4/en/document-store.html |
| 20 | InnoDB Cluster / ClusterSet | see manual under InnoDB Cluster |
| 21 | MySQL NDB Cluster 8.4 | https://dev.mysql.com/doc/refman/8.4/en/mysql-cluster.html |
| 22 | Partitioning | https://dev.mysql.com/doc/refman/8.4/en/partitioning.html |
| 23 | Stored Objects (procedures, functions, triggers, events) | https://dev.mysql.com/doc/refman/8.4/en/stored-objects.html |
| 24 | INFORMATION_SCHEMA | https://dev.mysql.com/doc/refman/8.4/en/information-schema.html |
| 25 | MySQL Performance Schema | https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html |
| 26 | MySQL sys Schema | https://dev.mysql.com/doc/refman/8.4/en/sys-schema.html |
| 27 | Connectors and APIs | https://dev.mysql.com/doc/refman/8.4/en/connectors-apis.html |
| 28 | Extending MySQL | https://dev.mysql.com/doc/refman/8.4/en/extending-mysql.html |
| 29 | MySQL Enterprise Edition features | see Enterprise sections in manual |
| — | Indexes (manual index) | https://dev.mysql.com/doc/refman/8.4/en/index.html |

## High-traffic subsections (fetch these often)

| Topic | URL |
|-------|-----|
| InnoDB best practices | https://dev.mysql.com/doc/refman/8.4/en/innodb-best-practices.html |
| Optimizing InnoDB transactions | https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-transaction-management.html |
| EXPLAIN | https://dev.mysql.com/doc/refman/8.4/en/using-explain.html |
| CREATE INDEX | https://dev.mysql.com/doc/refman/8.4/en/create-index.html |
| Transactions / COMMIT | https://dev.mysql.com/doc/refman/8.4/en/commit.html |
| SELECT … FOR UPDATE | https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html |
| SQL modes | https://dev.mysql.com/doc/refman/8.4/en/sql-mode.html |
| User account management | https://dev.mysql.com/doc/refman/8.4/en/user-account-management.html |
| Privileges | https://dev.mysql.com/doc/refman/8.4/en/privileges-provided.html |

## Protocol

1. Identify chapter from table.  
2. Fetch chapter hub, then drill to subsection links on that page.  
3. Quote official syntax/rules. Never invent SQL dialect differences vs Postgres without checking.
