CREATE TABLE coordinates (
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  color VARCHAR(8) NOT NULL,
  updated_at DATETIME,
  PRIMARY KEY (x, y)
);

