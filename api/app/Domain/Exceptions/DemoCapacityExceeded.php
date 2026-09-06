<?php

namespace App\Domain\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

class DemoCapacityExceeded extends HttpException
{
    public function __construct()
    {
        parent::__construct(429, 'Demo capacity reached. Please try again later.');
    }
}
