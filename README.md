# Naive HTML serialization from Sanity documents

This is the source for tooling for naively turning documents and rich text fields into HTML, deserializing them, combining them with source documents, and patching them back. Ideally, this should take in objects that are in portable text, text arrays, or objects with text fields without knowing their specific names or types, and be able to patch them back without additional work on the part of the developer.

This builds heavily on Sanity's [blocks-to-html](https://github.com/sanity-io/block-content-to-html) and [block-tools](https://github.com/sanity-io/sanity/tree/next/packages/@sanity/block-tools), and it's highly recommended you familiarize yourself with these if you plan on customizing.

If you're using any of our `TranslationTab` plugins, the scenarios below are some you might enocunter in your journey!

### Scenario: Some fields or objects in my document are serializing /deserializing strangely.
First: this is often caused by not declaring types at the top level of your schema. Serialization introspects your schema files and can get a much better sense of what to do when objects are not "anonymous" (this is similar to how our GraphQL functions work -- more info on "strict" schemas [here](https://www.sanity.io/docs/graphql#33ec7103289a)) You can save yourself some development time by trying this first.

If that's still not doing the trick, you can add on to the serializer to ensure you have complete say over how an object gets serialized and deserialized.

First, write your serialization rules:

```javascript
import { h } from '@sanity/block-content-to-html'
import { customSerializers } from 'whichever-sanity-plugin-translation-service-you-use'

const myCustomSerializerTypes = {
  ...customSerializers.types,
  myType: (props) => {
     const innerElements = //do things with the props
     //className and id is VERY important!! don't forget them!!
     return h('div', { className: props.node._type, id: props.node._key }, innerElements)
  }
}

const myCustomSerializers = customSerializers
myCustomSerializers.types = myCustomSerializerTypes

const myCustomDeserializer = {
  types: {
    myType: (htmlString) => {
      //parse it back out!
    }
  }
}
  
```

If your object is inline, then you may need to use the deserialization rules in Sanity's [block-tools](https://github.com/sanity-io/sanity/tree/next/packages/@sanity/block-tools). So you might declare something like this:

```javascript
const myBlockDeserializationRules = [
  {
    deserialize(el, next, block) {
      if (el.className.toLowerCase() != myType.toLowerCase()) {
        return undefined
      }
      
      //do stuff with the HTML string
      return {
        _type: 'myType',
        //all my other fields
      })
    }
]
```

Now, to bring it all together:

```javascript
import { TranslationTab, defaultDocumentLevelConfig, BaseDocumentSerializer, BaseDocumentDeserializer, BaseDocumentPatcher, defaultStopTypes } from 'whichever-sanity-plugin-translation-service-you-use'

const myCustomConfig = {
  ...defaultDocumentLevelConfig,
   exportForTranslation: (id) => 
    BaseDocumentSerializer.serializeDocument(
      id,
      'document',
      'en',
      defaultStopTypes,
      myCustomSerializers),
     importTranslation: (id, localeId, document) => {
        return BaseDocumentDeserializer.deserializeDocument(
          id,
          document,
          myCustomDeserializer,
          myBlockDeserializationRules).then(
            deserialized =>
              BaseDocumentPatcher.documentLevelPatch(deserialized, id, localeId)
          )
      }
}

```

Then, in your document structure, just feed the config into your `TranslationTab`.

```javascript
        S.view.component(TranslationTab).title('My Translation Service').options(
          myCustomConfig
        )
```

<br />
<br />

### Scenario: I want to have more granular control over how my documents get patched back to my dataset.

If all the serialization is working to your liking, but you have a different setup for how your document works, you can overwrite that patching logic.

```javascript
import { TranslationTab, defaultDocumentLevelConfig, BaseDocumentDeserializer } from 'whichever-sanity-plugin-translation-service-you-use'

const myCustomConfig = {
  ...defaultDocumentLevelConfig,
  importTranslation: (id, localeId, document) => {
    return BaseDocumentDeserializer.deserializeDocument(id,document).then(
        deserialized =>
        //you should have an object of translated values here. Do things with them!
      )
  }
}
```

<br />
<br />

### Scenario: I want to ensure certain fields never get sent to my translators.
The serializer actually introspects your schema files. You can set `localize: false` on a schema and that field should not be sent off. Example:
```javascript
   fields: [{
      name: 'categories',
      type: 'array',
      localize: false,
      ...
      }]
```

<br /> 
<br />

### Scenario: I want to ensure certain types of objects never get serialized or sent to my translators.

This plugin ships with a specification called `stopTypes`. By default it ignores fields that don't have useful linguistic information -- dates, numbers, etc. You can add to it easily.

```javascript
import { TranslationTab, defaultDocumentLevelConfig, defaultStopTypes, BaseDocumentSerializer } from "sanity-plugin-transifex"

const myCustomStopTypes = [
  ...defaultStopTypes,
  'listItem'
]

const myCustomConfig = {
  ...defaultDocumentLevelConfig,
  exportForTranslation: (id) => BaseDocumentSerializer.serializeDocument(
    id, 'document', 'en', myCustomStopTypes)
}
```

As above, feed the config into your `TranslationTab`.

```javascript

        S.view.component(TranslationTab).title('My Translation Service').options(
          myCustomConfig
        )

```

There's a number of further possibilities here. Pretty much every interface provided can be partially or fully overwritten. Do write an issue if something seems to never work how you expect, or if you'd like a more elegant way of doing things. 


Primary use case is for translation plugins, but likely has applications elsewhere!
