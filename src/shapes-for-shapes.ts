import { ShapeBuilder, property, self } from './builder';
import * as Rdf from './rdf';
import { PropertyPath, Shape, Vocabulary } from './shapes';
import { frame } from './frame';
import { ValueMapper } from './value-mapping';
import { rdf, xsd, ramp as rampVocabulary, makeRampVocabulary } from './vocabulary';

export function makeShapesForShapes(factory = Rdf.DefaultDataFactory) {
  const RDF_TYPE = factory.namedNode(rdf.type);
  const XSD_BOOLEAN = factory.namedNode(xsd.boolean);
  const XSD_STRING = factory.namedNode(xsd.string);
  const XSD_INTEGER = factory.namedNode(xsd.integer);
  const ramp = makeRampVocabulary(factory);

  const schema = new ShapeBuilder({factory, blankUniqueKey: 'shapes'});

  schema.union([
    ramp.ObjectShape,
    ramp.UnionShape,
    ramp.SetShape,
    ramp.OptionalShape,
    ramp.ResourceShape,
    ramp.LiteralShape,
    ramp.ListShape,
    ramp.MapShape,
  ], {
    id: ramp.Shape,
  });

  schema.resource({
    id: ramp.ShapeID,
    keepAsTerm: true,
  });

  const ShapeTypeVocabulary: Vocabulary = {
    id: ramp.ShapeTypeVocabulary,
    terms: {
      'object': ramp.ObjectShape,
      'union': ramp.UnionShape,
      'set': ramp.SetShape,
      'optional': ramp.OptionalShape,
      'resource': ramp.ResourceShape,
      'literal': ramp.LiteralShape,
      'list': ramp.ListShape,
      'map': ramp.MapShape,
    }
  };

  const makeBaseProperties = () => ({
    id: self(ramp.ShapeID),
    lenient: property(ramp.lenient, schema.optional(
      schema.literal({datatype: XSD_BOOLEAN})
    )),
  });

  schema.object({
    id: ramp.ObjectShape,
    typeProperties: {
      type: property(RDF_TYPE, schema.constant(
        ramp.ObjectShape, {vocabulary: ShapeTypeVocabulary}
      )),
    },
    properties: {
      ...makeBaseProperties(),
      typeProperties: property(ramp.typeProperty, schema.set(ramp.ObjectProperty)),
      properties: property(ramp.property, schema.set(ramp.ObjectProperty)),
    }
  });

  schema.object({
    id: ramp.ObjectProperty,
    properties: {
      name: property(ramp.name, schema.literal({datatype: XSD_STRING})),
      path: property(ramp.path, ramp.PropertyPath),
      valueShape: property(ramp.shape, ramp.Shape),
      transient: property(ramp.transient, schema.optional(
        schema.literal({datatype: XSD_BOOLEAN})
      )),
    }
  });

  schema.union([
    ramp.PredicatePath,
    ramp.SequencePath,
    ramp.InversePath,
    ramp.AlternativePath,
    ramp.ZeroOrMorePath,
    ramp.ZeroOrOnePath,
    ramp.OneOrMorePath,
  ], {
    id: ramp.PropertyPath,
  });

  schema.object({
    id: ramp.PredicatePath,
    properties: {
      predicate: self(schema.resource({onlyNamed: true, keepAsTerm: true})),
      // negative properties to exclude other property path types
      exclude: self(
        schema.set(
          schema.union([
            ramp.SequencePath,
            ramp.InversePath,
            ramp.AlternativePath,
            ramp.ZeroOrMorePath,
            ramp.ZeroOrOnePath,
            ramp.OneOrMorePath,
          ], {lenient: true}),
          {maxCount: 0}
        ),
        {transient: true}
      ),
    }
  });

  schema.object({
    id: ramp.SequencePath,
    properties: {
      sequence: self(schema.list(ramp.PropertyPath)),
    }
  });

  schema.object({
    id: ramp.InversePath,
    properties: {
      inverse: property(ramp.inversePath, ramp.PropertyPath),
    }
  });

  schema.object({
    id: ramp.AlternativePath,
    properties: {
      alternatives: property(ramp.alternativePath, schema.list(ramp.PropertyPath)),
    }
  });

  schema.object({
    id: ramp.ZeroOrMorePath,
    properties: {
      zeroOrMore: property(ramp.zeroOrMorePath, ramp.PropertyPath),
    }
  });

  schema.object({
    id: ramp.ZeroOrOnePath,
    properties: {
      zeroOrOne: property(ramp.zeroOrOnePath, ramp.PropertyPath),
    }
  });

  schema.object({
    id: ramp.OneOrMorePath,
    properties: {
      oneOrMore: property(ramp.oneOrMorePath, ramp.PropertyPath),
    }
  });

  schema.object({
    id: ramp.UnionShape,
    typeProperties: {
      type: property(RDF_TYPE, schema.constant(
        ramp.UnionShape, {vocabulary: ShapeTypeVocabulary}
      )),
    },
    properties: {
      ...makeBaseProperties(),
      variants: property(ramp.variant, schema.set(ramp.Shape)),
    }
  });

  schema.object({
    id: ramp.SetShape,
    typeProperties: {
      type: property(RDF_TYPE, schema.constant(
        ramp.SetShape, {vocabulary: ShapeTypeVocabulary}
      )),
    },
    properties: {
      ...makeBaseProperties(),
      itemShape: property(ramp.item, ramp.Shape),
      minCount: property(ramp.minCount, schema.optional(
        schema.literal({datatype: XSD_INTEGER})
      )),
      maxCount: property(ramp.maxCount, schema.optional(
        schema.literal({datatype: XSD_INTEGER})
      )),
    }
  });

  schema.object({
    id: ramp.OptionalShape,
    typeProperties: {
      type: property(RDF_TYPE, schema.constant(
        ramp.OptionalShape, {vocabulary: ShapeTypeVocabulary}
      )),
    },
    properties: {
      ...makeBaseProperties(),
      itemShape: property(ramp.item, ramp.Shape),
    }
  });

  schema.object({
    id: ramp.ResourceShape,
    typeProperties: {
      type: property(RDF_TYPE, schema.constant(
        ramp.ResourceShape, {vocabulary: ShapeTypeVocabulary}
      )),
    },
    properties: {
      ...makeBaseProperties(),
      onlyNamed: property(ramp.onlyNamed, schema.optional(
        schema.literal({datatype: XSD_BOOLEAN})
      )),
      value: property(ramp.termValue, schema.optional(schema.resource({keepAsTerm: true}))),
      keepAsTerm: property(ramp.keepAsTerm, schema.optional(
        schema.literal({datatype: XSD_BOOLEAN})
      )),
      vocabulary: property(ramp.vocabulary, schema.optional(ramp.Vocabulary)),
    }
  });

  const VocabularyItemKey = schema.literal({datatype: XSD_STRING});
  const VocabularyItemTerm = schema.resource({keepAsTerm: true});
  const VocabularyItem = schema.object({
    id: schema.makeShapeID('VocabularyItem'),
    typeProperties: {
      key: property(ramp.vocabKey, VocabularyItemKey),
    },
    properties: {
      term: property(ramp.termValue, VocabularyItemTerm),
    }
  });

  schema.object({
    id: ramp.Vocabulary,
    properties: {
      id: self(schema.optional(schema.resource())),
      terms: property(ramp.vocabItem, schema.map({
        key: {target: VocabularyItemKey},
        value: {target: VocabularyItemTerm},
        itemShape: VocabularyItem,
      })),
    }
  });

  schema.object({
    id: ramp.LiteralShape,
    typeProperties: {
      type: property(RDF_TYPE, schema.constant(
        ramp.LiteralShape, {vocabulary: ShapeTypeVocabulary}
      )),
    },
    properties: {
      ...makeBaseProperties(),
      datatype: property(ramp.termDatatype, schema.optional(schema.resource({keepAsTerm: true}))),
      language: property(ramp.termLanguage, schema.optional(schema.literal({datatype: XSD_STRING}))),
      value: property(ramp.termValue, schema.optional(schema.literal({keepAsTerm: true}))),
      keepAsTerm: property(ramp.keepAsTerm, schema.optional(
        schema.literal({datatype: XSD_BOOLEAN})
      )),
    }
  });

  schema.object({
    id: ramp.ListShape,
    typeProperties: {
      type: property(RDF_TYPE, schema.constant(
        ramp.ListShape, {vocabulary: ShapeTypeVocabulary}
      )),
    },
    properties: {
      ...makeBaseProperties(),
      itemShape: property(ramp.item, ramp.Shape),
      headPath: property(ramp.headPath, schema.optional(ramp.PropertyPath)),
      tailPath: property(ramp.tailPath, schema.optional(ramp.PropertyPath)),
      nil: property(ramp.nil, schema.optional(schema.resource({keepAsTerm: true}))),
    }
  });

  schema.object({
    id: ramp.MapShape,
    typeProperties: {
      type: property(RDF_TYPE, schema.constant(
        ramp.MapShape, {vocabulary: ShapeTypeVocabulary}
      )),
    },
    properties: {
      ...makeBaseProperties(),
      key: property(ramp.mapKey, ramp.ShapeReference),
      value: property(ramp.mapValue, schema.optional(ramp.ShapeReference)),
      itemShape: property(ramp.item, ramp.Shape),
    }
  });

  const TermPartVocabulary: Vocabulary = {
    terms: {
      'datatype': ramp.TermDatatype,
      'value': ramp.TermValue,
      'language': ramp.TermLanguage,
    }
  };

  schema.object({
    id: ramp.ShapeReference,
    properties: {
      target: property(ramp.shape, ramp.Shape),
      part: property(ramp.termPart, schema.optional(schema.union([
        schema.constant(ramp.TermDatatype, {vocabulary: TermPartVocabulary}),
        schema.constant(ramp.TermLanguage, {vocabulary: TermPartVocabulary}),
        schema.constant(ramp.TermValue, {vocabulary: TermPartVocabulary}),
      ])))
    }
  });

  return schema.shapes;
}

const PROPERTY_TYPE_MAPPER: ValueMapper = {
  fromRdf(value: unknown, shape: Shape): unknown {
    const type = getPropertyPathType(shape);
    return type ? {...(value as PropertyPath), type} : value;
  },
  toRdf(value: unknown, shape: Shape): unknown {
    return value;
  }
};

const DEFAULT_RAMP_VOCABULARY = makeRampVocabulary(Rdf.DefaultDataFactory);
function getPropertyPathType(shape: Shape): PropertyPath['type'] | undefined {
  const ramp = DEFAULT_RAMP_VOCABULARY;
  switch (shape.id.value) {
    case ramp.PredicatePath.value:
      return 'predicate';
    case ramp.SequencePath.value:
      return 'sequence';
    case ramp.InversePath.value:
      return 'inverse';
    case ramp.AlternativePath.value:
      return 'alternative';
    case ramp.ZeroOrMorePath.value:
      return 'zeroOrMore';
    case ramp.ZeroOrOnePath.value:
      return 'zeroOrOne';
    case ramp.OneOrMorePath.value:
      return 'oneOrMore';
    default:
      return undefined;
  }
}

export function frameShapes(dataset: Rdf.Dataset, factory = Rdf.DefaultDataFactory): Shape[] {
  const shapesForShapes = makeShapesForShapes(factory);
  const framingResults = frame({
    shape: shapesForShapes.get(factory.namedNode(rampVocabulary.Shape))!,
    dataset,
    mapper: ValueMapper.chainAsMappingFromRdf(
      ValueMapper.mapByDefault(factory),
      PROPERTY_TYPE_MAPPER
    ),
  });
  const shapes: Shape[] = [];
  for (const {value} of framingResults) {
    shapes.push(value as Shape);
  }
  return shapes;
}
