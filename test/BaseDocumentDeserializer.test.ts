import {readFileSync} from 'fs'

import {
  addedCustomDeserializers,
  getDeserialized,
  toPlainText,
  addedCustomSerializers,
  addedBlockDeserializers,
} from './helpers'
import {PortableTextBlock, PortableTextChild} from 'sanity'
import {BaseDocumentDeserializer, BaseDocumentSerializer, defaultStopTypes} from '../src'
import {customBlockDeserializers} from '../src/BaseSerializationConfig'

const documentLevelArticle = require('./__fixtures__/documentLevelArticle')
const inlineDocumentLevelArticle = require('./__fixtures__/inlineDocumentLevelArticle')
const fieldLevelArticle = require('./__fixtures__/fieldLevelArticle')
const annotationAndInlineBlocks = require('./__fixtures__/annotationAndInlineBlocks')
const customStyles = require('./__fixtures__/customStyles')

const schema = require('./__fixtures__/schema')
const inlineSchema = require('./__fixtures__/inlineSchema')

let mockTestKey = 0

//needed to make snapshots happy on internal spans (where we don't track keys)
// const originalModule = jest.requireActual('@sanity/block-tools')

jest.mock('@sanity/block-tools', () => {
  const originalModule = jest.requireActual('@sanity/block-tools')
  return {
    ...originalModule,
    //not ideal but jest.mock('@sanity/block-tools/src/util/randomKey.ts' is not working
    htmlToBlocks: (html: string, blockContentType: any, options: any) => {
      const blocks = originalModule.htmlToBlocks(html, blockContentType, options)
      const newBlocks = blocks.map((block: PortableTextBlock) => {
        const newChildren = (block.children as PortableTextChild[]).map((child) => {
          return {...child, _key: `randomKey-${mockTestKey++}`}
        })
        return {...block, children: newChildren}
      })
      return newBlocks
    },
  }
})

beforeEach(() => {
  mockTestKey = 0
})

test('Global test of working doc-level functionality and snapshot match', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  expect(deserialized).toMatchSnapshot()
})

test('Global test of working field-level functionality and snapshot match', () => {
  const deserialized = getDeserialized(fieldLevelArticle, 'field')
  expect(deserialized).toMatchSnapshot()
})

test('Contains id of original document', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  const id = deserialized._id
  expect(id).toEqual(documentLevelArticle._id)
})

test('Contains rev of original document', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  const rev = deserialized._rev
  expect(rev).toEqual(documentLevelArticle._rev)
})

test('Contains type of original document', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  const type = deserialized._type
  expect(type).toEqual(documentLevelArticle._type)
})

/*
 * DOCUMENT LEVEL
 */

/*
 * Top-level plain text
 */

test('String and text types get deserialized correctly at top-level -- document level', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  expect(deserialized.title).toEqual(documentLevelArticle.title)
  expect(deserialized.snippet).toEqual(documentLevelArticle.snippet)
})

/*
 * Presence and accuracy of fields in "vanilla" deserialization -- objects
 */
test('Nested object contains accurate values -- document level', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  const origTitle = documentLevelArticle.config.title
  const deserializedTitle = deserialized.config.title
  expect(origTitle).toEqual(deserializedTitle)

  const origBlockText = documentLevelArticle.config.nestedArrayField
  const deserializedBlockText = deserialized.config.nestedArrayField

  const origKeys = origBlockText.map((block: PortableTextBlock) => block._key)
  const deserializedKeys = deserializedBlockText.map((block: PortableTextBlock) => block._key)

  expect(deserializedKeys.sort()).toEqual(origKeys.sort())
  expect(toPlainText(deserializedBlockText)).toEqual(toPlainText(origBlockText))
})

test('Nested object in an object contains accurate values -- document level', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  const origNestedObject = documentLevelArticle.config.objectAsField
  const deserializedNestedObject = deserialized.config.objectAsField

  expect(origNestedObject.title).toEqual(deserializedNestedObject.title)

  const origKeys = origNestedObject.content.map((block: PortableTextBlock) => block._key)
  const deserializedKeys = deserializedNestedObject.content.map(
    (block: PortableTextBlock) => block._key
  )

  expect(origKeys.sort()).toEqual(deserializedKeys.sort())
  expect(toPlainText(deserializedNestedObject.content)).toEqual(
    toPlainText(origNestedObject.content)
  )
})

/*
 * Presence and accuracy of fields in vanilla deserialization -- arrays
 */

test('Array contains all serializable blocks with keys, in order -- document level', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  const origKeys = documentLevelArticle.content.map((block: PortableTextBlock) => block._key)
  const deserializedKeys = deserialized.content.map((block: PortableTextBlock) => block._key)
  expect(deserializedKeys.sort()).toEqual(origKeys.sort())
})

test('Array contains top-level block text -- document level', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  expect(toPlainText(deserialized.content)).toEqual(toPlainText(documentLevelArticle.content))
})

test('Object in array contains accurate values in nested object -- document level', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  const origTitle = documentLevelArticle.content.find(
    (block: Record<string, any>) => block._type === 'objectField'
  ).objectAsField.title
  const deserializedTitle = deserialized.content.find(
    (block: Record<string, any>) => block._type === 'objectField'
  ).objectAsField.title
  expect(deserializedTitle).toEqual(origTitle)

  const origBlockText = toPlainText(
    documentLevelArticle.content.find((block: Record<string, any>) => block._type === 'objectField')
      .objectAsField.content
  ).trim()
  const deserializedBlockText = toPlainText(
    documentLevelArticle.content.find((block: Record<string, any>) => block._type === 'objectField')
      .objectAsField.content
  ).trim()
  expect(deserializedBlockText).toEqual(origBlockText)
})

/*
 * FIELD LEVEL
 */

/*
 * Top-level plain text
 */

test('String and text types get deserialized correctly at top-level -- field level', () => {
  const deserialized = getDeserialized(fieldLevelArticle, 'field')
  expect(deserialized.title.en).toEqual(fieldLevelArticle.title.en)
  expect(deserialized.snippet.en).toEqual(fieldLevelArticle.snippet.en)
})

/*
 * Presence and accuracy of fields in "vanilla" deserialization -- objects
 */
test('Nested object contains accurate values -- field level', () => {
  const deserialized = getDeserialized(fieldLevelArticle, 'field')
  const origTitle = fieldLevelArticle.config.en.title
  const deserializedTitle = deserialized.config.en.title
  expect(origTitle).toEqual(deserializedTitle)

  const origBlockText = fieldLevelArticle.config.en.nestedArrayField
  const deserializedBlockText = deserialized.config.en.nestedArrayField

  const origKeys = origBlockText.map((block: PortableTextBlock) => block._key)
  const deserializedKeys = deserializedBlockText.map((block: PortableTextBlock) => block._key)

  expect(deserializedKeys.sort()).toEqual(origKeys.sort())
  expect(toPlainText(deserializedBlockText)).toEqual(toPlainText(origBlockText))
})

test('Nested object in an object contains accurate values -- field level', () => {
  const deserialized = getDeserialized(fieldLevelArticle, 'field')
  const origNestedObject = fieldLevelArticle.config.en.objectAsField
  const deserializedNestedObject = deserialized.config.en.objectAsField

  expect(origNestedObject.title).toEqual(deserializedNestedObject.title)

  const origKeys = origNestedObject.content.map((block: PortableTextBlock) => block._key)
  const deserializedKeys = deserializedNestedObject.content.map(
    (block: PortableTextBlock) => block._key
  )

  expect(origKeys.sort()).toEqual(deserializedKeys.sort())
  expect(toPlainText(deserializedNestedObject.content)).toEqual(
    toPlainText(origNestedObject.content)
  )
})

/*
 * Presence and accuracy of fields in vanilla deserialization -- arrays
 */

test('Array contains all serializable blocks with keys, in order -- field level', () => {
  const deserialized = getDeserialized(fieldLevelArticle, 'field')
  const origKeys = fieldLevelArticle.content.en.map((block: PortableTextBlock) => block._key)
  const deserializedKeys = deserialized.content.en.map((block: PortableTextBlock) => block._key)
  expect(deserializedKeys.sort()).toEqual(origKeys.sort())
})

test('Array contains top-level block text -- field level', () => {
  const deserialized = getDeserialized(fieldLevelArticle, 'field')
  expect(toPlainText(deserialized.content.en)).toEqual(toPlainText(fieldLevelArticle.content.en))
})

test('Object in array contains accurate values in nested object -- field level', () => {
  const deserialized = getDeserialized(fieldLevelArticle, 'field')
  const origTitle = fieldLevelArticle.content.en.find(
    (block: Record<string, any>) => block._type === 'objectField'
  ).objectAsField.title
  const deserializedTitle = deserialized.content.en.find(
    (block: Record<string, any>) => block._type === 'objectField'
  ).objectAsField.title
  expect(deserializedTitle).toEqual(origTitle)

  const origBlockText = toPlainText(
    fieldLevelArticle.content.en.find((block: Record<string, any>) => block._type === 'objectField')
      .objectAsField.content
  ).trim()
  const deserializedBlockText = toPlainText(
    fieldLevelArticle.content.en.find((block: Record<string, any>) => block._type === 'objectField')
      .objectAsField.content
  ).trim()
  expect(deserializedBlockText).toEqual(origBlockText)
})

/*
 * CUSTOM SETTINGS
 */

test('Custom deserialization should manifest at all levels', () => {
  const serialized = BaseDocumentSerializer(schema).serializeDocument(
    documentLevelArticle,
    'document',
    'en',
    defaultStopTypes,
    addedCustomSerializers
  )

  const deserialized = BaseDocumentDeserializer.deserializeDocument(
    serialized.content,
    addedCustomDeserializers,
    customBlockDeserializers
  )
  expect(deserialized.config.title).toEqual(documentLevelArticle.config.title)
  expect(deserialized.config._type).toEqual(documentLevelArticle.config._type)

  const origArrayObj = documentLevelArticle.content.find(
    (b: Record<string, any>) => b._type === 'objectField'
  )
  const deserializedArrayObj = deserialized.content.find(
    (b: Record<string, any>) => b._type === 'objectField'
  )

  expect(deserializedArrayObj.title).toEqual(origArrayObj.title)
  expect(deserializedArrayObj._key).toEqual(origArrayObj._key)
})

test('Content with custom styles deserializes correctly and maintains style', () => {
  //eslint-disable-next-line no-empty-function -- unhandled style throws a warn -- ignore it in this case
  jest.spyOn(console, 'warn').mockImplementation(() => {})

  const customStyledDocument = {
    ...documentLevelArticle,
    ...customStyles,
  }

  const serialized = BaseDocumentSerializer(schema).serializeDocument(
    customStyledDocument,
    'document'
  )

  const deserialized = BaseDocumentDeserializer.deserializeDocument(serialized.content)
  const origCustomStyleBlock = customStyledDocument.content.find(
    (b: Record<string, any>) => b._type === 'block' && b.style === 'custom1'
  )
  const origCustomStyleListItem = customStyledDocument.content.find(
    (b: Record<string, any>) =>
      b._type === 'block' && b.listItem === 'number' && b.style === 'custom1'
  )
  const deserializedCustomStyleBlock = deserialized.content.find(
    (b: Record<string, any>) => b._type === 'block' && b.style === 'custom1'
  )
  const deserializedCustomStyleListItem = deserialized.content.find(
    (b: Record<string, any>) =>
      b._type === 'block' && b.listItem === 'number' && b.style === 'custom1'
  )

  expect(deserializedCustomStyleBlock.children[0].text).toEqual(
    origCustomStyleBlock.children[0].text
  )

  expect(deserializedCustomStyleListItem.children[0].text).toEqual(
    origCustomStyleListItem.children[0].text
  )
})

//test -- unhandled annotations and inlines don't break when they get deserialized back
test('Handled inline objects should be accurately deserialized', () => {
  const inlineDocument = {
    ...documentLevelArticle,
    ...annotationAndInlineBlocks,
  }

  const serialized = BaseDocumentSerializer(schema).serializeDocument(
    inlineDocument,
    'document',
    'en',
    defaultStopTypes,
    addedCustomSerializers
  )

  const deserialized = BaseDocumentDeserializer.deserializeDocument(
    serialized.content,
    addedCustomDeserializers,
    addedBlockDeserializers
  )

  const getInlineObj = (content: PortableTextBlock[], level: number | undefined = undefined) => {
    let child: Record<string, any> = {}
    const blocks = content.filter((block: PortableTextBlock) => {
      if (level) {
        return block.level === level
      }
      return !block.level
    })

    blocks.forEach((block: PortableTextBlock) => {
      if (block.children && Array.isArray(block.children)) {
        child = block.children.find((span: Record<string, any>) => {
          if (level) {
            return span._type === 'childObjectField' && block.level === level
          }
          return span._type === 'childObjectField' && !block.level
        })
      }
    })

    return child
  }
  const origInlineObject = getInlineObj(inlineDocument.content)
  const origInlineListObject = getInlineObj(inlineDocument.content, 1)

  const deserializedInlineObject = getInlineObj(deserialized.content)
  const deserializedInlineListObject = getInlineObj(deserialized.content, 1)

  expect(deserializedInlineObject.title).toEqual(origInlineObject.title)
  expect(deserializedInlineObject._type).toEqual(origInlineObject._type)

  expect(deserializedInlineListObject.title).toEqual(origInlineListObject.title)
  expect(deserializedInlineListObject._type).toEqual(origInlineListObject._type)
})

test('Handled annotations should be accurately deserialized', () => {
  const inlineDocument = {
    ...documentLevelArticle,
    ...annotationAndInlineBlocks,
  }

  const serialized = BaseDocumentSerializer(schema).serializeDocument(
    inlineDocument,
    'document',
    'en',
    defaultStopTypes,
    addedCustomSerializers
  )

  const deserialized = BaseDocumentDeserializer.deserializeDocument(
    serialized.content,
    addedCustomDeserializers,
    addedBlockDeserializers
  )

  let origAnnotation: Record<string, any> | null = null
  let deserializedAnnotation: Record<string, any> | null = null

  inlineDocument.content.forEach((block: PortableTextBlock) => {
    if (block.children && Array.isArray(block.children)) {
      block.children.forEach((span: Record<string, any>) => {
        if (span.marks && span.marks.length) {
          origAnnotation = span
        }
      })
    }
  })

  deserialized.content.forEach((block: PortableTextBlock) => {
    if (block.children && Array.isArray(block.children)) {
      block.children.forEach((span: Record<string, any>) => {
        if (span.marks && span.marks.length) {
          deserializedAnnotation = span
        }
      })
    }
  })

  expect(deserializedAnnotation!.text).toEqual(origAnnotation!.text)
})

/*
 * STYLE TAGS
 */
test('Deserialized content should preserve style tags', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  const origH1 = documentLevelArticle.content.find(
    (block: PortableTextBlock) => block.style === 'h1'
  )
  const deserializedH1 = deserialized.content.find(
    (block: PortableTextBlock) => block.style === 'h1'
  )
  const origH2 = documentLevelArticle.content.find(
    (block: PortableTextBlock) => block.style === 'h2'
  )
  const deserializedH2 = deserialized.content.find(
    (block: PortableTextBlock) => block.style === 'h2'
  )
  expect(deserializedH1).toBeDefined()
  expect(deserializedH2).toBeDefined()
  expect(deserializedH1._key).toEqual(origH1._key)
  expect(deserializedH2._key).toEqual(origH2._key)
  expect(deserializedH1.children[0].text).toEqual(origH1.children[0].text)
  expect(deserializedH2.children[0].text).toEqual(origH2.children[0].text)
})

/*
 * LIST ITEMS
 */
test('Deserialized list items should preserve level, style and tag', () => {
  const deserialized = getDeserialized(documentLevelArticle, 'document')
  const origListItem = documentLevelArticle.content.find(
    (block: PortableTextBlock) => block.listItem === 'bullet' && block.style === 'h2'
  )
  const deserializedListItem = deserialized.content.find(
    (block: PortableTextBlock) => block.listItem === 'bullet' && block.style === 'h2'
  )
  const origNestedListItem = documentLevelArticle.content.find(
    (block: PortableTextBlock) => block.listItem === 'bullet' && block.level === 2
  )
  const deserializedNestedListItem = deserialized.content.find(
    (block: PortableTextBlock) => block.listItem === 'bullet' && block.level === 2
  )
  expect(deserializedListItem).toBeDefined()
  expect(deserializedNestedListItem).toBeDefined()
  expect(deserializedListItem._key).toEqual(origListItem._key)
  expect(deserializedNestedListItem._key).toEqual(origNestedListItem._key)
  expect(deserializedListItem.children[0].text).toEqual(origListItem.children[0].text)
  expect(deserializedNestedListItem.children[0].text).toEqual(origNestedListItem.children[0].text)
})

/*
 * MESSY INPUT
 */
test('&nbsp; whitespace should not be escaped', () => {
  //eslint-disable-next-line no-empty-function -- unhandled style throws a warn -- ignore it in this case
  jest.spyOn(console, 'debug').mockImplementation(() => {})

  const content = readFileSync('test/__fixtures__/messy-html.html', {
    encoding: 'utf-8',
  })
  const result = BaseDocumentDeserializer.deserializeDocument(content)
  expect(result.title).toEqual('Här är artikel titeln')
  expect(result.content[1].nestedArrayField[0].title).toEqual('Det här är en dragspels titeln')
})

/*
 * V2 functionality -- be able to operate without a strict schema
 */
test('Content with anonymous inline objects deserializes all fields, at any depth', () => {
  //eslint-disable-next-line no-empty-function -- unhandled style throws a warn -- ignore it in this case
  jest.spyOn(console, 'debug').mockImplementation(() => {})

  const serialized = BaseDocumentSerializer(inlineSchema).serializeDocument(
    inlineDocumentLevelArticle,
    'document'
  )

  const deserialized = BaseDocumentDeserializer.deserializeDocument(serialized.content)
  //object in field
  expect(deserialized.tabs.config.title).toEqual(inlineDocumentLevelArticle.tabs.config.title)

  //array in object in object
  expect(deserialized.tabs.config.objectAsField.content[0].children[0].text).toEqual(
    inlineDocumentLevelArticle.tabs.config.objectAsField.content[0].children[0].text
  )

  //arrays
  expect(deserialized.tabs.content).toBeInstanceOf(Array)
  expect(deserialized.tabs.content.map((block: any) => block._key)).toEqual(
    inlineDocumentLevelArticle.tabs.content.map((block: any) => block._key)
  )

  //object in array
  const origObj = inlineDocumentLevelArticle.tabs.content.find(
    (block: any) => block._type === 'objectField'
  )
  const deserializedObj = deserialized.tabs.content.find(
    (block: any) => block._type === 'objectField'
  )

  expect(deserializedObj.title).toEqual(origObj.title)
  expect(deserializedObj.objectAsField.content[0].children[0].text).toEqual(
    origObj.objectAsField.content[0].children[0].text
  )

  //anonymous object in array
  const origArray = inlineDocumentLevelArticle.tabs.arrayWithAnonymousObjects
  const deserializedArray = deserialized.tabs.arrayWithAnonymousObjects
  expect(deserializedArray.length).toEqual(origArray.length)
  expect(deserializedArray[0]._key).toEqual(origArray[0]._key)
  expect(Object.keys(deserializedArray[0])).not.toContain('span')
})
