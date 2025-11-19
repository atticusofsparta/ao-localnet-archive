# Replace the line "let rateLimitFile = {}" with code to parse DEFAULT_RATE_LIMIT from env
/^  let rateLimitFile = {}$/c\
  // Parse DEFAULT_RATE_LIMIT from environment (JSON string)\
  let rateLimitFile = {}\
  try {\
    if (ctx.DEFAULT_RATE_LIMIT) {\
      rateLimitFile = JSON.parse(ctx.DEFAULT_RATE_LIMIT)\
      console.log('Loaded DEFAULT_RATE_LIMIT:', rateLimitFile)\
    }\
  } catch (e) {\
    console.error('Failed to parse DEFAULT_RATE_LIMIT:', e)\
  }
