<?php

namespace App\Domain\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

class DemoWriteLimitExceeded extends HttpException
{
    public function __construct()
    {
        parent::__construct(429, 'Demo write limit reached. Reset your demo workspace to continue.');
    }
}
