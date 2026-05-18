
DO $$
DECLARE
  v_lei uuid;
BEGIN
  SELECT id INTO v_lei FROM vade_mecum_leis WHERE slug = 'estatuto-oab';

  -- Muito alta relevância
  UPDATE vade_mecum_artigos SET relevancia = 'muito_alta'
   WHERE lei_id = v_lei
     AND regexp_replace(numero, '\D', '', 'g') IN
         ('1','2','7','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','70','71','72');

  -- Alta relevância
  UPDATE vade_mecum_artigos SET relevancia = 'alta'
   WHERE lei_id = v_lei AND relevancia IS NULL
     AND regexp_replace(numero, '\D', '', 'g') IN
         ('3','4','6','8','9','10','11','15','16','17','39','40','41','42','43','44','45','54','58','68','69','73','74','75');

  -- Média relevância
  UPDATE vade_mecum_artigos SET relevancia = 'media'
   WHERE lei_id = v_lei AND relevancia IS NULL
     AND regexp_replace(numero, '\D', '', 'g') IN
         ('5','12','13','14','18','19','20','21','46','47','48','49','50','51','52','53','55','56','57','59','60','61','62','63','64','65','66','67');
END $$;
