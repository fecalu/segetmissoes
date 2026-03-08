INSERT INTO veiculos (placa, modelo, marca)
SELECT 'AAA1A11', 'FH 460', 'Volvo'
WHERE NOT EXISTS (SELECT 1 FROM veiculos WHERE placa = 'AAA1A11');

INSERT INTO veiculos (placa, modelo, marca)
SELECT 'BBB2B22', 'Actros 2651', 'Mercedes'
WHERE NOT EXISTS (SELECT 1 FROM veiculos WHERE placa = 'BBB2B22');
